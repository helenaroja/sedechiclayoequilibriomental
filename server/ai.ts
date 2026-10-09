export type ConfigIA = { apiKey?: string; model?: string; timeoutMs?: number }

export type CodigoError =
  | 'solicitud_invalida'
  | 'sin_clave'
  | 'clave_invalida'
  | 'modelo_no_disponible'
  | 'solicitud_rechazada'
  | 'limite_de_uso'
  | 'servicio_ocupado'
  | 'tiempo_agotado'
  | 'red'
  | 'respuesta_invalida'

class ErrorIA extends Error {
  constructor(
    readonly codigo: CodigoError,
    readonly detalle: string,
  ) {
    super(codigo)
  }
}

type Registro = { fecha: string; texto: string }
type TurnoHistorial = { rol: 'usuario' | 'asistente'; texto: string }
type Turno = { role: 'user' | 'assistant'; content: string }

type Solicitud =
  | { tipo: 'analizar_dia'; fecha: string; texto: string; memoria: string[] }
  | { tipo: 'patrones'; entradas: Registro[]; memoria: string[] }
  | {
      tipo: 'rutina'
      fecha: string
      analisis: { resumen: string; dificultades: string[]; accionesSugeridas: string[] }
      historial: { fecha: string; dificultades: string[] }[]
      memoria: string[]
      rechazadas: string[]
      instruccion: 'nueva' | 'alternativa'
    }
  | {
      tipo: 'chat'
      mensaje: string
      historial: TurnoHistorial[]
      memoria: string[]
      contexto: Registro[]
    }

const MAX_ENTRADAS = 30
const MAX_TEXTO = 4000
const MAX_MEMORIA = 20
const TIPOS_MEMORIA = ['objetivo', 'preferencia', 'rutina_aceptada', 'rutina_rechazada', 'funciona', 'no_funciona', 'correccion'] as const

const URL_ANTHROPIC = 'https://api.anthropic.com/v1/messages'

const SISTEMA_ANALISIS_DIA = `Eres un acompañante de bienestar para estudiantes universitarios peruanos. Lees el relato de UN día que escribió la persona. Puede ser informal, tener faltas de ortografía o describir varias situaciones.

Analiza solo lo que el texto dice:
- No inventes emociones, actividades, problemas, causas ni resultados. Si algo no aparece, no lo incluyas.
- No califiques a la persona ni la corrijas por cómo escribe.
- Si el día fue bueno, reconócelo y no inventes un problema.
- "positivos": logros o experiencias positivas que el texto describe. Cada uno lleva una "cita" copiada palabra por palabra del relato.
- "emociones": solo las que el texto expresa de forma explícita.
- "habitos": hábitos relacionados con sueño, estudio, organización o uso del celular que el texto describe. Área: "sueño", "estudio", "organización", "celular" u "otro".
- "posiblesRelaciones": posibles relaciones entre hábitos y resultados, expresadas con prudencia ("podría", "parece"). Nunca afirmes causalidad.
- "accionesSugeridas": una o dos acciones concretas y pequeñas que podrían ayudar mañana, relacionadas con lo que el texto describe.
- No diagnostiques, no menciones trastornos y no recomiendes medicamentos.

Si hay una memoria del estudiante, úsala solo si es relevante para interpretar este día.

Responde únicamente con JSON válido con esta forma:
{"resumen": string, "actividades": string[], "emociones": string[], "dificultades": string[], "positivos": [{"texto": string, "cita": string}], "habitos": [{"area": string, "descripcion": string}], "factores": string[], "posiblesRelaciones": string[], "accionesSugeridas": string[], "senalRiesgo": boolean}
"senalRiesgo" es true solo si el texto expresa riesgo para la vida o autolesión.`

const SISTEMA_PATRONES = `Eres un acompañante de bienestar para estudiantes universitarios peruanos. Recibes varios registros diarios de la misma persona, con fecha. Tu tarea es encontrar hábitos o situaciones que se repiten en días distintos.

Reglas:
- Analiza el significado de cada relato; no busques palabras exactas.
- Un patrón exige la misma situación en al menos dos días distintos. Si no hay ninguno, devuelve "patrones": [].
- No mezcles datos de otras personas ni inventes registros.
- "fechas" solo pueden ser fechas de la lista recibida. "extractos" son citas copiadas textualmente de esos días.
- "posibleRelacion" se expresa con prudencia y nunca afirma causalidad.
- "fortalezas" son hábitos positivos que aparecen en los registros.
- "siguientePaso" es una acción pequeña para probar.
- Si se detecta un patrón positivo (por ejemplo, un hábito que ayuda), inclúyelo también.
- No diagnostiques ni recomiendes medicamentos.

Responde únicamente con JSON válido: {"patrones": [{"nombre": string, "observacion": string, "fechas": string[], "extractos": [{"fecha": string, "cita": string}], "posibleRelacion": string, "fortalezas": string[], "siguientePaso": string}]}`

const SISTEMA_RUTINA = `Eres un asistente de hábitos para estudiantes universitarios peruanos. Creas UNA rutina personalizada a partir del análisis del día que describió la persona.

Reglas:
- Basa la rutina solo en el análisis y en el historial recibidos. No asumas horarios, clases, trabajo ni preferencias que no aparezcan.
- Si hay memoria del estudiante, respétala: por ejemplo, no propongas de nuevo una rutina que rechazó ni ignores un horario que indicó.
- Pasos concretos, ordenados y realistas: entre 3 y 5.
- "porQue" explica brevemente por qué podría ayudar, sin prometer resultados.
- "patronObservado" describe la dificultad observada en los datos recibidos. Si es un único día, dilo: "Observado en este día", sin hablar de un patrón recurrente.
- "alternativaSimple" es una versión más fácil para un día difícil.
- Si la instrucción es "alternativa", propón un enfoque distinto al anterior.
- No diagnostiques ni recomiendes medicamentos.

Responde únicamente con JSON válido: {"titulo": string, "patronObservado": string, "porQue": string, "pasos": string[], "duracionMinutos": number, "alternativaSimple": string}`

function sistemaChat(memoria: string[], contexto: Registro[]): string {
  const bloqueMemoria =
    memoria.length > 0
      ? `Memoria que el estudiante te ha compartido antes (úsala cuando sea relevante, sin repetirla de forma mecánica):\n${memoria.map((m) => `- ${m}`).join('\n')}`
      : 'Aún no tienes memoria guardada de esta persona.'
  const bloqueRegistros =
    contexto.length > 0
      ? `Registros que la persona compartió contigo (menciona la fecha si los usas):\n${contexto.map((r) => `[${r.fecha}] ${r.texto}`).join('\n')}`
      : 'No tienes acceso a sus registros diarios en esta conversación. No los menciones.'

  return `Eres un asistente conversacional de bienestar para estudiantes universitarios peruanos. Conversas en español natural, cercano y comprensivo.

Cómo conversar:
- Comprende el mensaje completo antes de responder y responde directamente a lo que la persona pregunta.
- Mantén la coherencia con la conversación anterior. No repitas consejos que ya diste, salvo que los retomes con un ajuste concreto según lo que la persona contó.
- Si la persona aporta información personal (por ejemplo, a qué hora usa el celular), adapta tu respuesta a esa información.
- Haz una pregunta de seguimiento cuando te falte información para ayudar mejor. No obligues a la persona a contarte su día si pregunta otra cosa.
- Da recomendaciones concretas cuando se pidan y explicaciones más amplias cuando hagan falta. Usa listas solo cuando ayuden.
- Adapta el tono a lo que expresa la persona. No exageres emociones ni uses frases motivacionales en cada respuesta.
- No inventes estudios, estadísticas, fuentes ni cifras. Si no sabes algo o no tienes información suficiente, dilo.
- Si mencionas fuentes oficiales (por ejemplo MINSA, OMS o una universidad), solo menciona el nombre de la institución, sin enlaces.
- No diagnostiques ni recomiendes medicamentos. Recuerda, cuando corresponda, que no reemplazas a un profesional de salud.
- Si la persona expresa riesgo para su vida o autolesión, responde con cuidado, anímala a buscar ayuda de inmediato (106 SAMU, 105 Policía o Línea 113 del MINSA, opción 5) y pon "senalRiesgo" en true.

Si la persona comparte un objetivo, una preferencia de horario o de estudio, una limitación, o cómo le fue con una rutina (si le funcionó o no), agrégalo a "memoriaNueva" como una frase breve en tercera persona, con su tipo. Usa solo lo que la persona dijo explícitamente en sus mensajes. Si no hay nada nuevo que recordar, devuelve [].

${bloqueMemoria}

${bloqueRegistros}

Responde únicamente con JSON válido: {"respuesta": string, "senalRiesgo": boolean, "memoriaNueva": [{"tipo": "objetivo" | "preferencia" | "rutina_aceptada" | "rutina_rechazada" | "funciona" | "no_funciona" | "correccion", "texto": string}]}`
}

function texto(valor: unknown, max: number): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim().slice(0, max) : null
}

function listaTextos(valor: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(valor)) return []
  return valor
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .map((x) => x.trim().slice(0, maxLen))
    .slice(0, maxItems)
}

function memoriaDe(valor: unknown): string[] {
  return listaTextos(valor, MAX_MEMORIA, 200)
}

function esRegistro(x: unknown): x is Registro {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  return typeof r.fecha === 'string' && typeof r.texto === 'string' && r.texto.length <= MAX_TEXTO
}

function validar(body: unknown): Solicitud | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const memoria = memoriaDe(b.memoria)

  if (b.tipo === 'analizar_dia') {
    const t = texto(b.texto, MAX_TEXTO)
    const fecha = texto(b.fecha, 10)
    return t && fecha ? { tipo: 'analizar_dia', fecha, texto: t, memoria } : null
  }

  if (b.tipo === 'patrones') {
    if (!Array.isArray(b.entradas) || b.entradas.length === 0 || b.entradas.length > MAX_ENTRADAS || !b.entradas.every(esRegistro)) return null
    return { tipo: 'patrones', entradas: b.entradas as Registro[], memoria }
  }

  if (b.tipo === 'rutina') {
    const fecha = texto(b.fecha, 10)
    const a = b.analisis as Record<string, unknown> | undefined
    const resumen = texto(a?.resumen, 1000)
    if (!fecha || !resumen || (b.instruccion !== 'nueva' && b.instruccion !== 'alternativa')) return null
    const historial = Array.isArray(b.historial)
      ? b.historial
          .filter((h): h is { fecha: string; dificultades: string[] } => typeof h?.fecha === 'string')
          .map((h) => ({ fecha: h.fecha, dificultades: listaTextos(h.dificultades, 10, 200) }))
          .slice(-10)
      : []
    return {
      tipo: 'rutina',
      fecha,
      analisis: {
        resumen,
        dificultades: listaTextos(a?.dificultades, 10, 200),
        accionesSugeridas: listaTextos(a?.accionesSugeridas, 5, 200),
      },
      historial,
      memoria,
      rechazadas: listaTextos(b.rechazadas, 10, 200),
      instruccion: b.instruccion,
    }
  }

  if (b.tipo === 'chat') {
    const mensaje = texto(b.mensaje, 1000)
    if (!mensaje) return null
    const historial = Array.isArray(b.historial)
      ? b.historial
          .filter((m): m is TurnoHistorial => (m?.rol === 'usuario' || m?.rol === 'asistente') && typeof m?.texto === 'string')
          .slice(-10)
      : []
    const contexto = Array.isArray(b.contexto) ? b.contexto.filter(esRegistro).slice(-MAX_ENTRADAS) : []
    return { tipo: 'chat', mensaje, historial, memoria, contexto }
  }

  return null
}

function extraerDetalle(cuerpo: string): string {
  try {
    const json = JSON.parse(cuerpo) as { error?: { type?: string; message?: string } }
    const partes = [json.error?.type, json.error?.message].filter(Boolean).join(': ')
    return partes.slice(0, 200)
  } catch {
    return cuerpo.slice(0, 120).replace(/\s+/g, ' ')
  }
}

function codigoDeEstado(status: number, detalle: string): CodigoError {
  if (status === 401 || status === 403) return 'clave_invalida'
  if (status === 404 || (status === 400 && /model/i.test(detalle))) return 'modelo_no_disponible'
  if (status === 429) return 'limite_de_uso'
  if (status === 400 || status === 422) return 'solicitud_rechazada'
  return 'servicio_ocupado'
}

async function llamarClaude(config: ConfigIA, system: string, mensajes: Turno[], maxTokens: number): Promise<string> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), config.timeoutMs ?? 45000)
  let respuesta: Response
  try {
    respuesta = await fetch(URL_ANTHROPIC, {
      method: 'POST',
      signal: controlador.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: config.model, max_tokens: maxTokens, system, messages: mensajes }),
    })
  } catch (error) {
    if (controlador.signal.aborted) throw new ErrorIA('tiempo_agotado', 'la solicitud superó el tiempo máximo')
    throw new ErrorIA('red', error instanceof Error ? error.name : 'error de red')
  } finally {
    clearTimeout(temporizador)
  }

  if (!respuesta.ok) {
    const detalle = extraerDetalle(await respuesta.text().catch(() => ''))
    throw new ErrorIA(codigoDeEstado(respuesta.status, detalle), `HTTP ${respuesta.status} ${detalle}`)
  }

  const datos = (await respuesta.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string }
  const salida = (datos.content ?? [])
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text ?? '')
    .join('')
  if (!salida.trim()) throw new ErrorIA('respuesta_invalida', 'respuesta vacía')
  if (datos.stop_reason === 'max_tokens') {
    throw new ErrorIA('respuesta_invalida', `respuesta cortada por el límite de ${maxTokens} tokens (final: "${salida.slice(-80).replace(/\s+/g, ' ')}")`)
  }
  return salida
}

function extraerJson(salida: string): unknown {
  const texto = salida.replace(/```(?:json)?/gi, '')
  for (let inicio = texto.indexOf('{'); inicio !== -1; inicio = texto.indexOf('{', inicio + 1)) {
    let profundidad = 0
    let enCadena = false
    let escape = false
    for (let i = inicio; i < texto.length; i++) {
      const c = texto[i]
      if (enCadena) {
        if (escape) escape = false
        else if (c === '\\') escape = true
        else if (c === '"') enCadena = false
        continue
      }
      if (c === '"') enCadena = true
      else if (c === '{') profundidad++
      else if (c === '}') {
        profundidad--
        if (profundidad === 0) {
          try {
            return JSON.parse(texto.slice(inicio, i + 1))
          } catch {
            break
          }
        }
      }
    }
  }
  const inicio = salida.replace(/\s+/g, ' ').slice(0, 160)
  throw new ErrorIA('respuesta_invalida', `la respuesta no contiene JSON válido (inicio: "${inicio}")`)
}

async function consultarJson<T>(
  config: ConfigIA,
  system: string,
  mensajes: Turno[],
  maxTokens: number,
  validador: (json: unknown) => T,
): Promise<T> {
  let ultimo: unknown
  for (let intento = 0; intento < 2; intento++) {
    try {
      return validador(extraerJson(await llamarClaude(config, system, mensajes, maxTokens)))
    } catch (error) {
      ultimo = error
      if (!(error instanceof ErrorIA) || error.codigo !== 'respuesta_invalida') break
    }
  }
  throw ultimo
}

function validarAnalisisDia(json: unknown, textoOriginal: string) {
  const j = json as Record<string, unknown>
  const resumen = texto(j.resumen, 1000)
  if (!resumen) throw new ErrorIA('respuesta_invalida', 'falta resumen')
  const positivos = Array.isArray(j.positivos)
    ? j.positivos
        .filter((p): p is { texto: string; cita: string } => typeof p?.texto === 'string' && typeof p?.cita === 'string')
        .filter((p) => p.cita.trim() !== '' && textoOriginal.includes(p.cita.trim()))
        .map((p) => ({ texto: p.texto.trim(), cita: p.cita.trim() }))
    : []
  const habitos = Array.isArray(j.habitos)
    ? j.habitos
        .filter((h): h is { area: string; descripcion: string } => typeof h?.area === 'string' && typeof h?.descripcion === 'string')
        .map((h) => ({ area: h.area.trim(), descripcion: h.descripcion.trim() }))
    : []
  return {
    resumen,
    actividades: listaTextos(j.actividades, 15, 200),
    emociones: listaTextos(j.emociones, 10, 100),
    factores: listaTextos(j.factores, 10, 200),
    dificultades: listaTextos(j.dificultades, 10, 200),
    positivos,
    habitos,
    posiblesRelaciones: listaTextos(j.posiblesRelaciones, 5, 300),
    accionesSugeridas: listaTextos(j.accionesSugeridas, 2, 300),
    senalRiesgo: j.senalRiesgo === true,
  }
}

function validarPatrones(json: unknown, entradas: Registro[]) {
  const lista = (json as { patrones?: unknown }).patrones
  if (!Array.isArray(lista)) throw new ErrorIA('respuesta_invalida', 'falta la lista de patrones')
  const fechasValidas = new Map<string, string>()
  for (const e of entradas) fechasValidas.set(e.fecha, (fechasValidas.get(e.fecha) ?? '') + ` ${e.texto}`)

  return lista.flatMap((p: Record<string, unknown>) => {
    const nombre = texto(p.nombre, 150)
    if (!nombre) return []
    const extractos = Array.isArray(p.extractos) ? p.extractos : []
    const evidencia = [...new Set(listaTextos(p.fechas, 30, 10))]
      .filter((f) => fechasValidas.has(f))
      .map((fecha) => {
        const cita = extractos.find((x: Record<string, unknown>) => x?.fecha === fecha) as { cita?: unknown } | undefined
        const citaTexto = typeof cita?.cita === 'string' ? cita.cita.trim() : ''
        return citaTexto && fechasValidas.get(fecha)!.includes(citaTexto) ? { fecha, extracto: citaTexto.slice(0, 200) } : null
      })
      .filter((e): e is { fecha: string; extracto: string } => e !== null)
    if (evidencia.length < 2) return []
    return [
      {
        nombre,
        observacion: texto(p.observacion, 600) ?? '',
        evidencia,
        posibleRelacion: texto(p.posibleRelacion, 400) ?? '',
        fortalezas: listaTextos(p.fortalezas, 5, 200),
        siguientePaso: texto(p.siguientePaso, 300) ?? '',
      },
    ]
  })
}

function validarRutina(json: unknown) {
  const j = json as Record<string, unknown>
  const titulo = texto(j.titulo, 120)
  const porQue = texto(j.porQue, 600)
  const pasos = listaTextos(j.pasos, 5, 300)
  const alternativaSimple = texto(j.alternativaSimple, 300)
  if (!titulo || !porQue || pasos.length < 3 || !alternativaSimple) throw new ErrorIA('respuesta_invalida', 'rutina incompleta')
  const duracion = typeof j.duracionMinutos === 'number' && Number.isFinite(j.duracionMinutos) ? Math.min(60, Math.max(3, Math.round(j.duracionMinutos))) : 10
  return {
    titulo,
    patronObservado: texto(j.patronObservado, 400) ?? '',
    porQue,
    pasos,
    duracionMinutos: duracion,
    alternativaSimple,
  }
}

function validarChat(json: unknown) {
  const j = json as Record<string, unknown>
  const respuesta = texto(j.respuesta, 4000)
  if (!respuesta) throw new ErrorIA('respuesta_invalida', 'respuesta de chat vacía')
  const memoriaNueva = Array.isArray(j.memoriaNueva)
    ? j.memoriaNueva
        .filter((m): m is { tipo: string; texto: string } => typeof m?.texto === 'string' && typeof m?.tipo === 'string')
        .filter((m) => (TIPOS_MEMORIA as readonly string[]).includes(m.tipo) && m.texto.trim() !== '')
        .map((m) => ({ tipo: m.tipo, texto: m.texto.trim().slice(0, 200) }))
        .slice(0, 3)
    : []
  return { respuesta, senalRiesgo: j.senalRiesgo === true, memoriaNueva }
}

function formatearRegistros(entradas: Registro[]): string {
  return entradas.map((e) => `[${e.fecha}] ${e.texto}`).join('\n')
}

function memoriaTexto(memoria: string[]): string {
  return memoria.length > 0 ? `Memoria del estudiante:\n${memoria.map((m) => `- ${m}`).join('\n')}` : 'Memoria del estudiante: (vacía)'
}

async function ejecutar(config: ConfigIA, solicitud: Solicitud) {
  if (solicitud.tipo === 'analizar_dia') {
    const resultado = await consultarJson(
      config,
      SISTEMA_ANALISIS_DIA,
      [{ role: 'user', content: `Fecha: ${solicitud.fecha}\nRelato:\n${solicitud.texto}\n\n${memoriaTexto(solicitud.memoria)}` }],
      2000,
      (j) => validarAnalisisDia(j, solicitud.texto),
    )
    return { resultado }
  }

  if (solicitud.tipo === 'patrones') {
    const diasDistintos = new Set(solicitud.entradas.map((e) => e.fecha)).size
    if (diasDistintos < 2) return { resultado: { patrones: [] } }
    const resultado = await consultarJson(
      config,
      SISTEMA_PATRONES,
      [{ role: 'user', content: `Registros:\n${formatearRegistros(solicitud.entradas)}\n\n${memoriaTexto(solicitud.memoria)}` }],
      2000,
      (j) => ({ patrones: validarPatrones(j, solicitud.entradas) }),
    )
    return { resultado }
  }

  if (solicitud.tipo === 'rutina') {
    const historial = solicitud.historial.map((h) => `[${h.fecha}] dificultades: ${h.dificultades.join('; ') || 'ninguna mencionada'}`).join('\n')
    const contenido = `Análisis del día ${solicitud.fecha}:
Resumen: ${solicitud.analisis.resumen}
Dificultades: ${solicitud.analisis.dificultades.join('; ') || 'ninguna'}
Acciones ya sugeridas: ${solicitud.analisis.accionesSugeridas.join('; ') || 'ninguna'}

Historial reciente de dificultades:
${historial || '(sin días anteriores)'}

${memoriaTexto(solicitud.memoria)}
Rutinas rechazadas antes (no las repitas): ${solicitud.rechazadas.join('; ') || 'ninguna'}
Instrucción: ${solicitud.instruccion === 'alternativa' ? 'alternativa' : 'nueva'}`
    const resultado = await consultarJson(config, SISTEMA_RUTINA, [{ role: 'user', content: contenido }], 1500, validarRutina)
    return { resultado }
  }

  const previos: Turno[] = []
  const primerUsuario = solicitud.historial.findIndex((m) => m.rol === 'usuario')
  for (const m of primerUsuario === -1 ? [] : solicitud.historial.slice(primerUsuario)) {
    previos.push({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })
  }
  const salida = await llamarClaude(config, sistemaChat(solicitud.memoria, solicitud.contexto), [...previos, { role: 'user', content: solicitud.mensaje }], 1000)
  let json: unknown
  try {
    json = extraerJson(salida)
  } catch {
    json = { respuesta: salida.trim(), senalRiesgo: false, memoriaNueva: [] }
  }
  return { resultado: validarChat(json) }
}

const MENSAJES_HTTP: Record<CodigoError, number> = {
  solicitud_invalida: 400,
  sin_clave: 503,
  clave_invalida: 502,
  modelo_no_disponible: 502,
  solicitud_rechazada: 502,
  limite_de_uso: 429,
  servicio_ocupado: 503,
  tiempo_agotado: 504,
  red: 502,
  respuesta_invalida: 502,
}

export async function procesarSolicitud(body: unknown, config: ConfigIA): Promise<{ status: number; body: unknown }> {
  const solicitud = validar(body)
  if (!solicitud) return { status: 400, body: { error: 'solicitud_invalida' } }
  if (!config.apiKey) {
    console.error(`[ia] accion=${solicitud.tipo} codigo=sin_clave: falta ANTHROPIC_API_KEY en el servidor`)
    return { status: 503, body: { error: 'sin_clave' } }
  }

  try {
    const { resultado } = await ejecutar(config, solicitud)
    return { status: 200, body: { resultado } }
  } catch (error) {
    const codigo: CodigoError = error instanceof ErrorIA ? error.codigo : 'servicio_ocupado'
    const detalle = error instanceof ErrorIA ? error.detalle : String(error)
    console.error(`[ia] accion=${solicitud.tipo} codigo=${codigo} ${detalle}`)
    return { status: MENSAJES_HTTP[codigo], body: { error: codigo } }
  }
}
