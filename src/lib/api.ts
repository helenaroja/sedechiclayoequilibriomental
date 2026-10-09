import { fechaClave, type AnalisisDia, type Mensaje, type Registro } from './datos'
import type { PatronCrudo } from './analisis'

export type ResultadoIA<T> = { modo: 'ia'; datos: T } | { modo: 'demo' } | { modo: 'error'; mensaje: string }

export type DiaRespuesta = Omit<AnalisisDia, 'creado' | 'correccion'> & { fecha: string }

export type RespuestaAnalisis = {
  dias?: DiaRespuesta[]
  senalRiesgo?: boolean
  patrones?: PatronCrudo[]
}

export type RespuestaChat = { respuesta: string; senalRiesgo?: boolean }

export type RespuestaRutina = {
  titulo: string
  problema: string
  porQue: string
  pasos: string[]
  duracionMinutos: number
  alternativaSimple: string
}

export const MENSAJE_ERROR_TECNICO =
  'Hubo un problema técnico con el servicio de IA. No es un error tuyo: tu registro sigue guardado. Puedes intentarlo de nuevo en unos minutos.'

function aEntradas(registros: Registro[]) {
  return registros.map((r) => ({ fecha: fechaClave(r.creado), texto: r.texto }))
}

async function llamar<T>(cuerpo: unknown): Promise<ResultadoIA<T>> {
  try {
    const respuesta = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    if (respuesta.status === 503) return { modo: 'demo' }
    if (!respuesta.ok) return { modo: 'error', mensaje: MENSAJE_ERROR_TECNICO }
    const json = (await respuesta.json()) as { resultado: T }
    return { modo: 'ia', datos: json.resultado }
  } catch {
    return {
      modo: 'error',
      mensaje: 'No hay conexión con el servicio de IA. Revisa tu internet e intenta de nuevo. Tu registro sigue guardado.',
    }
  }
}

export function analizarConIA(registros: Registro[]) {
  return llamar<RespuestaAnalisis>({ tipo: 'analizar', entradas: aEntradas(registros) })
}

export function conversarConIA(
  mensaje: string,
  historial: Pick<Mensaje, 'rol' | 'texto'>[],
  registrosDeContexto: Registro[],
) {
  return llamar<RespuestaChat>({
    tipo: 'chat',
    mensaje,
    entradas: aEntradas(registrosDeContexto.slice(-30)),
    historial,
  })
}

export function proponerRutinaConIA(
  patron: { nombre: string; observacion: string; evidencia: { fecha: string; extracto: string }[] },
  registros: Registro[],
  instruccion: 'nueva' | 'mas_simple' | 'otra',
) {
  return llamar<RespuestaRutina>({
    tipo: 'rutina',
    patron,
    entradas: aEntradas(registros.slice(-10)),
    instruccion,
  })
}
