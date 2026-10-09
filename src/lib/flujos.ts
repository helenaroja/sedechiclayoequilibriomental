import {
  fechaClave,
  memoriaDelUsuario,
  nuevoId,
  normalizarTexto,
  registrosDelUsuario,
  rutinasDelUsuario,
  type AnalisisDia,
  type Estado,
  type Patron,
  type Registro,
  type Rutina,
} from './datos'
import { analizarDiaIA, analizarPatronesIA, generarRutinaIA } from './api'

export type Fallo = { ok: false; codigo: string; mensaje: string }
export type Exito<T> = { ok: true; datos: T }
export type Resultado<T> = Exito<T> | Fallo

const MAXIMO_REGISTROS_PATRONES = 30

export function memoriaParaIA(estado: Estado): string[] {
  return memoriaDelUsuario(estado)
    .slice(-15)
    .map((m) => m.texto)
}

export function rechazadasParaIA(estado: Estado): string[] {
  return rutinasDelUsuario(estado)
    .filter((r) => r.estado === 'descartada')
    .map((r) => r.titulo)
    .slice(-10)
}

async function analizarRegistro(registro: Registro, memoria: string[]): Promise<Resultado<AnalisisDia>> {
  const r = await analizarDiaIA(fechaClave(registro.creado), registro.texto, memoria)
  if (!r.ok) return r
  return { ok: true, datos: { ...r.datos, creado: new Date().toISOString() } }
}

async function rutinaPara(params: {
  usuarioId: string
  registro: Registro
  analisis: AnalisisDia
  registros: Registro[]
  memoria: string[]
  rechazadas: string[]
}): Promise<Resultado<Rutina>> {
  const historial = params.registros
    .filter((r) => r.id !== params.registro.id && r.analisis)
    .sort((a, b) => a.creado.localeCompare(b.creado))
    .slice(-10)
    .map((r) => ({ fecha: fechaClave(r.creado), dificultades: r.analisis!.dificultades }))

  const r = await generarRutinaIA({
    fecha: fechaClave(params.registro.creado),
    analisis: {
      resumen: params.analisis.resumen,
      dificultades: params.analisis.dificultades,
      accionesSugeridas: params.analisis.accionesSugeridas,
    },
    historial,
    memoria: params.memoria,
    rechazadas: params.rechazadas,
    instruccion: 'nueva',
  })
  if (!r.ok) return r

  return {
    ok: true,
    datos: {
      id: nuevoId(),
      usuarioId: params.usuarioId,
      registroId: params.registro.id,
      creada: new Date().toISOString(),
      ...r.datos,
      estado: 'propuesta',
      modificada: false,
      resultados: [],
      comentarios: [],
    },
  }
}

async function patronesDelUsuario(estado: Estado, registros: Registro[], memoria: string[]): Promise<Resultado<Patron[]>> {
  const ordenados = [...registros].sort((a, b) => a.creado.localeCompare(b.creado)).slice(-MAXIMO_REGISTROS_PATRONES)
  if (new Set(ordenados.map((r) => fechaClave(r.creado))).size < 2) return { ok: true, datos: [] }

  const r = await analizarPatronesIA(
    ordenados.map((x) => ({ fecha: fechaClave(x.creado), texto: x.texto })),
    memoria,
  )
  if (!r.ok) return r

  const ahora = new Date().toISOString()
  return {
    ok: true,
    datos: r.datos.patrones.map((p) => {
      const previo = estado.patrones.find((x) => normalizarTexto(x.nombre) === normalizarTexto(p.nombre))
      return {
        id: previo?.id ?? nuevoId(),
        usuarioId: estado.usuarioId,
        nombre: p.nombre,
        observacion: p.observacion,
        posibleRelacion: p.posibleRelacion,
        evidencia: p.evidencia,
        fortalezas: p.fortalezas,
        siguientePaso: p.siguientePaso,
        interpretacion: previo?.interpretacion,
        creado: previo?.creado ?? ahora,
      }
    }),
  }
}

export type ResultadoDia = {
  registro: Registro
  rutina?: Rutina
  patrones?: Resultado<Patron[]>
}

// Analiza un día real: la IA interpreta el texto, luego se genera una rutina a partir
// de ese análisis y, si hay al menos dos días, se recalculan los patrones.
export async function procesarDia(estado: Estado, registro: Registro): Promise<ResultadoDia> {
  const memoria = memoriaParaIA(estado)
  const analisis = await analizarRegistro(registro, memoria)
  if (!analisis.ok) {
    return { registro: { ...registro, errorAnalisis: analisis.mensaje } }
  }

  const conAnalisis: Registro = { ...registro, analisis: analisis.datos, errorAnalisis: undefined }
  const registros = [...registrosDelUsuario(estado).filter((r) => r.id !== registro.id), conAnalisis]

  const [rutina, patrones] = await Promise.all([
    rutinaPara({
      usuarioId: estado.usuarioId,
      registro: conAnalisis,
      analisis: analisis.datos,
      registros,
      memoria,
      rechazadas: rechazadasParaIA(estado),
    }),
    patronesDelUsuario(estado, registros, memoria),
  ])

  if (rutina.ok) {
    return {
      registro: { ...conAnalisis, rutinaId: rutina.datos.id, errorRutina: undefined },
      rutina: rutina.datos,
      patrones,
    }
  }
  return { registro: { ...conAnalisis, errorRutina: rutina.mensaje }, patrones }
}

// Vuelve a intentar solo la rutina de un día que ya tiene análisis.
export async function reintentarRutina(estado: Estado, registro: Registro): Promise<{ registro: Registro; rutina?: Rutina }> {
  if (!registro.analisis) return { registro }
  const registros = registrosDelUsuario(estado)
  const r = await rutinaPara({
    usuarioId: estado.usuarioId,
    registro,
    analisis: registro.analisis,
    registros,
    memoria: memoriaParaIA(estado),
    rechazadas: rechazadasParaIA(estado),
  })
  if (r.ok) return { registro: { ...registro, rutinaId: r.datos.id, errorRutina: undefined }, rutina: r.datos }
  return { registro: { ...registro, errorRutina: r.mensaje } }
}

// Pide una alternativa distinta para la rutina de un día ya analizado.
export async function pedirAlternativa(estado: Estado, registro: Registro, anterior: Rutina): Promise<Resultado<Rutina>> {
  if (!registro.analisis) return { ok: false, codigo: 'solicitud_invalida', mensaje: 'Este día todavía no tiene análisis.' }
  const r = await generarRutinaIA({
    fecha: fechaClave(registro.creado),
    analisis: {
      resumen: registro.analisis.resumen,
      dificultades: registro.analisis.dificultades,
      accionesSugeridas: registro.analisis.accionesSugeridas,
    },
    historial: [],
    memoria: memoriaParaIA(estado),
    rechazadas: [...rechazadasParaIA(estado), anterior.titulo],
    instruccion: 'alternativa',
  })
  if (!r.ok) return r
  return {
    ok: true,
    datos: {
      id: nuevoId(),
      usuarioId: estado.usuarioId,
      registroId: registro.id,
      creada: new Date().toISOString(),
      ...r.datos,
      estado: 'propuesta',
      modificada: false,
      resultados: [],
      comentarios: [],
    },
  }
}

export async function recalcularPatrones(estado: Estado): Promise<Resultado<Patron[]>> {
  return patronesDelUsuario(estado, registrosDelUsuario(estado), memoriaParaIA(estado))
}
