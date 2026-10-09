import { fechaClave, type Registro } from './datos'
import type { DiaAnalizado, PatronCrudo } from './analisis'

export type ResultadoIA<T> = { modo: 'ia'; datos: T } | { modo: 'demo' } | { modo: 'error'; mensaje: string }

export type RespuestaAnalisis = {
  dias?: DiaAnalizado[]
  senalRiesgo?: boolean
  patrones?: PatronCrudo[]
}

export type RespuestaChat = { respuesta: string; senalRiesgo?: boolean }

export function aEntradas(registros: Registro[]) {
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
    if (!respuesta.ok) return { modo: 'error', mensaje: 'No se pudo completar la solicitud. Intenta de nuevo.' }
    const json = (await respuesta.json()) as { resultado: T }
    return { modo: 'ia', datos: json.resultado }
  } catch {
    return { modo: 'error', mensaje: 'No hay conexión con el servicio. Revisa tu internet e intenta de nuevo.' }
  }
}

export function analizarConIA(registros: Registro[]) {
  return llamar<RespuestaAnalisis>({ tipo: 'analizar', entradas: aEntradas(registros) })
}

export function conversarConIA(mensaje: string, registros: Registro[], historial: { rol: 'usuario' | 'asistente'; texto: string }[]) {
  return llamar<RespuestaChat>({ tipo: 'chat', mensaje, entradas: aEntradas(registros.slice(-30)), historial })
}
