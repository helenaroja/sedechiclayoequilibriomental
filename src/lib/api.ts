import type { Memoria, Mensaje, Positivo, Habito } from './datos'

export type Resultado<T> = { ok: true; datos: T } | { ok: false; codigo: string; mensaje: string }

const MENSAJES: Record<string, string> = {
  sin_clave:
    'El servicio de IA no está configurado en el servidor: falta la clave de acceso. Tu información sigue guardada.',
  clave_invalida:
    'El servicio de IA rechazó la clave de acceso configurada en el servidor. Tu información sigue guardada. Quien administra la aplicación debe revisar ANTHROPIC_API_KEY.',
  modelo_no_disponible:
    'El modelo de IA configurado no está disponible. Tu información sigue guardada. Quien administra la aplicación debe revisar ANTHROPIC_MODEL.',
  solicitud_rechazada: 'El servicio de IA no pudo procesar esta solicitud. Tu información sigue guardada.',
  limite_de_uso: 'Se alcanzó el límite de uso del servicio de IA. Intenta de nuevo en unos minutos. Tu información sigue guardada.',
  servicio_ocupado: 'El servicio de IA está ocupado o no responde. Intenta de nuevo en unos minutos. Tu información sigue guardada.',
  tiempo_agotado: 'La IA tardó demasiado en responder. Intenta de nuevo. Tu información sigue guardada.',
  red: 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo. Tu información sigue guardada.',
  respuesta_invalida: 'La IA respondió, pero la respuesta no se pudo leer. Intenta de nuevo. Tu información sigue guardada.',
  solicitud_invalida: 'No se pudo enviar la solicitud porque faltan datos. Revisa el texto e intenta de nuevo.',
}

export type RespuestaAnalisisDia = {
  resumen: string
  actividades: string[]
  emociones: string[]
  factores: string[]
  dificultades: string[]
  positivos: Positivo[]
  habitos: Habito[]
  posiblesRelaciones: string[]
  accionesSugeridas: string[]
  senalRiesgo: boolean
}

export type RespuestaPatron = {
  nombre: string
  observacion: string
  evidencia: { fecha: string; extracto: string }[]
  posibleRelacion: string
  fortalezas: string[]
  siguientePaso: string
}

export type RespuestaRutina = {
  titulo: string
  patronObservado: string
  porQue: string
  pasos: string[]
  duracionMinutos: number
  alternativaSimple: string
}

export type RespuestaChat = {
  respuesta: string
  senalRiesgo: boolean
  memoriaNueva: { tipo: string; texto: string }[]
}

async function llamar<T>(cuerpo: unknown): Promise<Resultado<T>> {
  let respuesta: Response
  try {
    respuesta = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    return { ok: false, codigo: 'red', mensaje: MENSAJES.red }
  }

  let json: { resultado?: T; error?: string } = {}
  try {
    json = (await respuesta.json()) as typeof json
  } catch {
    json = {}
  }

  if (respuesta.ok && json.resultado !== undefined) return { ok: true, datos: json.resultado }

  const codigo = json.error ?? (respuesta.status === 404 ? 'ruta_no_encontrada' : 'servicio_ocupado')
  console.error(`[ia] ${String(cuerpo && (cuerpo as { tipo?: string }).tipo)} respondió ${respuesta.status} (${codigo})`)
  return {
    ok: false,
    codigo,
    mensaje: MENSAJES[codigo] ?? `No se pudo completar la solicitud (código ${respuesta.status}). Tu información sigue guardada.`,
  }
}

export function analizarDiaIA(fecha: string, texto: string, memoria: string[]) {
  return llamar<RespuestaAnalisisDia>({ tipo: 'analizar_dia', fecha, texto, memoria })
}

export function analizarPatronesIA(entradas: { fecha: string; texto: string }[], memoria: string[]) {
  return llamar<{ patrones: RespuestaPatron[] }>({ tipo: 'patrones', entradas, memoria })
}

export function generarRutinaIA(input: {
  fecha: string
  analisis: { resumen: string; dificultades: string[]; accionesSugeridas: string[] }
  historial: { fecha: string; dificultades: string[] }[]
  memoria: string[]
  rechazadas: string[]
  instruccion: 'nueva' | 'alternativa'
}) {
  return llamar<RespuestaRutina>({ tipo: 'rutina', ...input })
}

export function conversarIA(input: {
  mensaje: string
  historial: Pick<Mensaje, 'rol' | 'texto'>[]
  memoria: Memoria[]
  contexto: { fecha: string; texto: string }[]
}) {
  return llamar<RespuestaChat>({
    tipo: 'chat',
    mensaje: input.mensaje,
    historial: input.historial,
    memoria: input.memoria.map((m) => m.texto),
    contexto: input.contexto,
  })
}
