type Entrada = { fecha: string; texto: string }
type MensajeChat = { rol: 'usuario' | 'asistente'; texto: string }
type PatronEntrada = { nombre: string; observacion: string; evidencia: { fecha: string; extracto: string }[] }
type Instruccion = 'nueva' | 'mas_simple' | 'otra'

type Solicitud =
  | { tipo: 'analizar'; entradas: Entrada[] }
  | { tipo: 'chat'; mensaje: string; entradas: Entrada[]; historial: MensajeChat[] }
  | { tipo: 'rutina'; patron: PatronEntrada; entradas: Entrada[]; instruccion: Instruccion }

export type ConfigIA = { apiKey?: string; model?: string }

type Turno = { role: 'user' | 'assistant'; content: string }

const MAX_ENTRADAS = 30
const MAX_TEXTO = 4000

const SISTEMA_ANALISIS = `Eres un acompañante de bienestar para estudiantes universitarios peruanos. Lees los relatos diarios que escriben, a menudo de forma informal, con errores de ortografía o describiendo varias situaciones en un mismo texto. Tu tarea es comprenderlos y analizarlos. Nunca calificas al estudiante ni lo corriges por cómo escribe.

Reglas obligatorias:
- Interpreta el significado completo de cada relato, no solo palabras clave. Un relato puede describir actividades, emociones, dificultades y aspectos positivos a la vez.
- No asumas emociones, causas ni acontecimientos que el texto no mencione. Si algo no está dicho, no lo incluyas.
- No hagas juicios de valor ni uses calificativos negativos sobre la persona.
- "dias": incluye una entrada por cada fecha con relato, con la fecha exactamente como aparece en la lista. "resumen" son una o dos frases neutrales sobre el día.
- "positivos": solo logros o cosas buenas que el texto describe. Cada uno lleva una "cita" copiada textualmente, palabra por palabra, del relato de ese día.
- Un patrón exige la misma situación en al menos dos días distintos. Si solo hay un día, "patrones" debe ser [].
- En "patrones", "fechas" son los días donde aparece la situación y "extractos" son citas textuales de esos días (máximo 25 palabras cada una).
- "posibleRelacion" se expresa con prudencia ("podría", "parece"). Nunca afirmes causa y efecto.
- "fortalezas" son hábitos positivos que aparecen en los relatos. "siguientePaso" es una acción pequeña, de máximo 10 minutos, que la persona puede probar.
- No diagnostiques, no menciones trastornos y no recomiendes medicamentos.
- "senalRiesgo" es true solo si el texto expresa riesgo para la vida o autolesión.

Responde únicamente con JSON válido con esta forma:
{"dias":[{"fecha":string,"resumen":string,"actividades":string[],"emociones":string[],"factores":string[],"dificultades":string[],"positivos":[{"texto":string,"cita":string}]}],"patrones":[{"nombre":string,"observacion":string,"fechas":string[],"extractos":[{"fecha":string,"cita":string}],"posibleRelacion":string,"fortalezas":string[],"siguientePaso":string}],"senalRiesgo":boolean}`

function sistemaChat(entradas: Entrada[]): string {
  const contexto =
    entradas.length > 0
      ? `Registros que el estudiante compartió contigo. Úsalos solo si son relevantes para la pregunta y menciona la fecha cuando lo hagas:\n${formatearEntradas(entradas)}`
      : 'No tienes acceso a los registros del estudiante en esta conversación. No los menciones.'

  return `Eres un asistente conversacional de bienestar para estudiantes universitarios peruanos. Respondes preguntas generales sobre sueño, estudio y concentración, organización del tiempo, emociones, estrés, procrastinación y creación de hábitos.

Cómo responder:
- Responde exactamente a lo que se pregunta, de forma clara y natural, en español cercano.
- Da recomendaciones prácticas con pasos que la persona pueda aplicar hoy. Si ayuda, usa una lista numerada de máximo 5 pasos.
- Si falta información para responder con seguridad, haz una pregunta aclaratoria breve en lugar de inventar.
- No repitas consejos genéricos ni frases de relleno. Adapta la respuesta a la pregunta concreta.
- No inventes estudios, estadísticas, fuentes ni cifras. Si no tienes información suficiente o no estás seguro, dilo.
- Si mencionas fuentes oficiales (por ejemplo MINSA, OMS o una universidad), menciona solo el nombre de la institución. No incluyas enlaces.
- No diagnostiques ni recomiendes medicamentos. Cuando sea pertinente, recuerda que no reemplazas a un profesional de salud.
- Si la persona expresa riesgo para su vida o autolesión, responde con cuidado, anímala a buscar ayuda de inmediato (106 SAMU, 105 Policía o la Línea 113 del MINSA, opción 5) y pon "senalRiesgo" en true.

${contexto}

Responde únicamente con JSON válido: {"respuesta": string, "senalRiesgo": boolean}`
}

const SISTEMA_RUTINA = `Eres un asistente de hábitos para estudiantes universitarios peruanos. Propones una rutina concreta para un problema que la persona describió en sus registros.

Reglas:
- Basa la propuesta solo en el patrón y en los registros que recibes. No asumas horarios, responsabilidades ni preferencias que no aparezcan.
- Explica por qué la rutina podría ayudar, sin afirmar que la solucionará.
- Pasos claros y ordenados: entre 3 y 5, pequeños y realistas.
- Indica una duración aproximada en minutos.
- Incluye una alternativa más sencilla para los días difíciles.
- Si la instrucción es "mas_simple", reduce la exigencia. Si es "otra", propón un enfoque distinto al habitual. Si es "nueva", propón la mejor opción.
- No diagnostiques ni recomiendes medicamentos. No prometas resultados.

Responde únicamente con JSON válido: {"titulo": string, "problema": string, "porQue": string, "pasos": string[], "duracionMinutos": number, "alternativaSimple": string}`

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

function esPatron(x: unknown): x is PatronEntrada {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    typeof p.nombre === 'string' &&
    typeof p.observacion === 'string' &&
    Array.isArray(p.evidencia) &&
    p.evidencia.length <= 10 &&
    p.evidencia.every((e) => typeof e?.fecha === 'string' && typeof e?.extracto === 'string')
  )
}

function validar(body: unknown): Solicitud | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.entradas) || b.entradas.length > MAX_ENTRADAS || !b.entradas.every(esEntrada)) return null
  const entradas = b.entradas as Entrada[]

  if (b.tipo === 'analizar') {
    return entradas.length > 0 ? { tipo: 'analizar', entradas } : null
  }
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
  if (b.tipo === 'rutina' && esPatron(b.patron) && (b.instruccion === 'nueva' || b.instruccion === 'mas_simple' || b.instruccion === 'otra')) {
    return { tipo: 'rutina', patron: b.patron, entradas, instruccion: b.instruccion }
  }
  return null
}

function formatearEntradas(entradas: Entrada[]): string {
  return entradas.map((e) => `[${e.fecha}] ${e.texto}`).join('\n')
}

function formatearRutina(solicitud: Extract<Solicitud, { tipo: 'rutina' }>): string {
  const evidencia = solicitud.patron.evidencia.map((e) => `- [${e.fecha}] "${e.extracto}"`).join('\n')
  return `Patrón: ${solicitud.patron.nombre}
Observación previa: ${solicitud.patron.observacion}
Evidencia:
${evidencia}

Registros recientes del estudiante:
${formatearEntradas(solicitud.entradas)}

Instrucción: ${solicitud.instruccion}`
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

function extraerJson(texto: string): unknown {
  return JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1))
}

async function consultar(config: ConfigIA, system: string, mensajes: Turno[], maxTokens: number): Promise<unknown> {
  let ultimoError: unknown
  for (let intento = 0; intento < 2; intento++) {
    try {
      const texto = await llamarClaude(config, system, mensajes, maxTokens)
      return extraerJson(texto)
    } catch (error) {
      console.error(`Intento ${intento + 1} fallido:`, error)
      ultimoError = error
    }
  }
  throw ultimoError
}

async function consultarChat(config: ConfigIA, system: string, mensajes: Turno[]): Promise<unknown> {
  const texto = await llamarClaude(config, system, mensajes, 1000)
  if (!texto.trim()) throw new Error('Respuesta vacía de la IA')
  try {
    return extraerJson(texto)
  } catch {
    console.error('Respuesta de chat sin JSON, se usa el texto tal cual:', texto.slice(0, 200))
    return { respuesta: texto.trim(), senalRiesgo: false }
  }
}

export async function procesarSolicitud(body: unknown, config: ConfigIA): Promise<{ status: number; body: unknown }> {
  const solicitud = validar(body)
  if (!solicitud) return { status: 400, body: { error: 'solicitud_invalida' } }
  if (!config.apiKey) return { status: 503, body: { error: 'sin_clave' } }

  try {
    if (solicitud.tipo === 'analizar') {
      const resultado = await consultar(
        config,
        SISTEMA_ANALISIS,
        [{ role: 'user', content: formatearEntradas(solicitud.entradas) }],
        3000,
      )
      return { status: 200, body: { resultado } }
    }

    if (solicitud.tipo === 'rutina') {
      const resultado = await consultar(
        config,
        SISTEMA_RUTINA,
        [{ role: 'user', content: formatearRutina(solicitud) }],
        1200,
      )
      return { status: 200, body: { resultado } }
    }

    const primerUsuario = solicitud.historial.findIndex((m) => m.rol === 'usuario')
    const previos: Turno[] = (primerUsuario === -1 ? [] : solicitud.historial.slice(primerUsuario)).map((m) => ({
      role: m.rol === 'usuario' ? 'user' : 'assistant',
      content: m.texto,
    }))
    const resultado = await consultarChat(config, sistemaChat(solicitud.entradas), [
      ...previos,
      { role: 'user', content: solicitud.mensaje },
    ])
    return { status: 200, body: { resultado } }
  } catch (error) {
    console.error('Fallo al consultar la IA:', error)
    return { status: 502, body: { error: 'fallo_ia' } }
  }
}
