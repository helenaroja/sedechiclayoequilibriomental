type Entrada = { fecha: string; texto: string }
type MensajeChat = { rol: 'usuario' | 'asistente'; texto: string }

type Solicitud =
  | { tipo: 'analizar'; entradas: Entrada[] }
  | { tipo: 'chat'; mensaje: string; entradas: Entrada[]; historial: MensajeChat[] }

type Turno = { role: 'user' | 'assistant'; content: string }

export type ConfigIA = { apiKey?: string; model?: string }

const MAX_ENTRADAS = 30
const MAX_TEXTO = 4000

const SISTEMA_ANALISIS = `Eres un acompañante de bienestar para estudiantes universitarios peruanos. Analizas relatos diarios que el estudiante escribió.

Reglas obligatorias:
- Usa solo lo que aparece en los relatos. No inventes hechos, emociones, recuerdos ni antecedentes.
- Un patrón exige que la situación aparezca en al menos dos días distintos. Un hecho de un solo día no es un patrón: no lo incluyas.
- En "fechas" incluye solo fechas (AAAA-MM-DD) de los registros donde aparece la situación, copiadas exactamente de la lista.
- En "extractos" incluye, para cada fecha, una cita COPIADA TEXTUALMENTE del registro de ese día (máximo 25 palabras) que muestre la situación. No parafrasees ni cambies una palabra.
- Usa lenguaje prudente ("podría", "parece"). No diagnostiques ni menciones trastornos. No recomiendes medicamentos.
- Propón dos alternativas por patrón. Cada una debe ser una acción concreta de máximo 15 minutos.
- En "dias" incluye una entrada por cada fecha con relato: las emociones y factores (situaciones, personas, tareas, etc.) que el texto menciona explícitamente ese día. Si no hay ninguno, deja la lista vacía.
- Pon "senalRiesgo" en true solo si el relato expresa riesgo para la vida o autolesión.

Responde únicamente con JSON válido con esta forma:
{"dias": [{"fecha": string, "emociones": string[], "factores": string[]}], "senalRiesgo": boolean, "patrones": [{"nombre": string, "observacion": string, "fechas": string[], "extractos": [{"fecha": string, "cita": string}], "efecto": string, "alternativas": [{"titulo": string, "explicacion": string, "paso": string, "minutos": number}]}]}
Si no hay patrones respaldados, devuelve "patrones": [].`

function sistemaChat(contexto: string): string {
  return `Eres un acompañante de bienestar para estudiantes universitarios peruanos. Respondes en español natural, cercano y empático, sin juzgar. Máximo 120 palabras.

Reglas:
- Valida primero lo que la persona expresa. No respondas siempre con consejos; a veces pregunta qué tipo de apoyo necesita.
- Solo puedes referirte a los registros que aparecen abajo. No digas que recuerdas algo que no está ahí.
- No diagnostiques ni recomiendes medicamentos. No prometas mejoras.
- Si expresa riesgo para su vida o autolesión, anímala a buscar ayuda profesional o de emergencia de inmediato (106 SAMU, 105 Policía, o Línea 113 opción 5 del MINSA) y pon "senalRiesgo" en true.

Registros disponibles del estudiante (del más antiguo al más reciente):
${contexto}

Responde únicamente con JSON válido: {"respuesta": string, "senalRiesgo": boolean}`
}

function esEntrada(x: unknown): x is Entrada {
  if (typeof x !== 'object' || x === null) return false
  const e = x as Record<string, unknown>
  return typeof e.fecha === 'string' && typeof e.texto === 'string' && e.texto.length <= MAX_TEXTO
}

function esMensaje(x: unknown): x is MensajeChat {
  if (typeof x !== 'object' || x === null) return false
  const m = x as Record<string, unknown>
  return (m.rol === 'usuario' || m.rol === 'asistente') && typeof m.texto === 'string'
}

function validar(body: unknown): Solicitud | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.entradas) || b.entradas.length > MAX_ENTRADAS || !b.entradas.every(esEntrada)) return null
  const entradas = b.entradas as Entrada[]
  if (b.tipo === 'analizar') return { tipo: 'analizar', entradas }
  if (
    b.tipo === 'chat' &&
    typeof b.mensaje === 'string' &&
    b.mensaje.trim().length > 0 &&
    b.mensaje.length <= 1000 &&
    Array.isArray(b.historial)
  ) {
    const historial = (b.historial as unknown[]).slice(-10).filter(esMensaje)
    return { tipo: 'chat', mensaje: b.mensaje, entradas, historial }
  }
  return null
}

function formatearEntradas(entradas: Entrada[]): string {
  return entradas.map((e) => `[${e.fecha}] ${e.texto}`).join('\n')
}

async function llamarClaude(config: ConfigIA, system: string, mensajes: Turno[], maxTokens: number): Promise<string> {
  const respuesta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiKey ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model ?? 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: mensajes,
    }),
  })
  if (!respuesta.ok) throw new Error(`Anthropic respondió ${respuesta.status}`)
  const datos = (await respuesta.json()) as { content: { type: string; text?: string }[] }
  return datos.content
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text ?? '')
    .join('')
}

function extraerJson<T>(texto: string): T {
  return JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1)) as T
}

export async function procesarSolicitud(
  body: unknown,
  config: ConfigIA,
): Promise<{ status: number; body: unknown }> {
  const solicitud = validar(body)
  if (!solicitud) return { status: 400, body: { error: 'solicitud_invalida' } }
  if (!config.apiKey) return { status: 503, body: { error: 'sin_clave' } }

  try {
    if (solicitud.tipo === 'analizar') {
      let ultimoError: unknown
      for (let intento = 0; intento < 2; intento++) {
        try {
          const texto = await llamarClaude(
            config,
            SISTEMA_ANALISIS,
            [{ role: 'user', content: formatearEntradas(solicitud.entradas) }],
            2500,
          )
          return { status: 200, body: { resultado: extraerJson(texto) } }
        } catch (error) {
          ultimoError = error
        }
      }
      throw ultimoError
    }

    const primerUsuario = solicitud.historial.findIndex((m) => m.rol === 'usuario')
    const previos: Turno[] = (primerUsuario === -1 ? [] : solicitud.historial.slice(primerUsuario)).map((m) => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: m.texto,
    }))
    const texto = await llamarClaude(
      config,
      sistemaChat(formatearEntradas(solicitud.entradas)),
      [...previos, { role: 'user', content: solicitud.mensaje }],
      600,
    )
    return { status: 200, body: { resultado: extraerJson(texto) } }
  } catch (error) {
    console.error('Fallo al consultar la IA:', error)
    return { status: 502, body: { error: 'fallo_ia' } }
  }
}
