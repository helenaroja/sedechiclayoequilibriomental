export type Positivo = { texto: string; cita: string }

export type Habito = { area: string; descripcion: string }

export type AnalisisDia = {
  creado: string
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
  correccion?: string
}

export type Registro = {
  id: string
  usuarioId: string
  creado: string
  texto: string
  analisis?: AnalisisDia
  errorAnalisis?: string
  rutinaId?: string
  errorRutina?: string
}

export type Rutina = {
  id: string
  usuarioId: string
  registroId: string
  creada: string
  titulo: string
  patronObservado: string
  porQue: string
  pasos: string[]
  duracionMinutos: number
  alternativaSimple: string
  estado: 'propuesta' | 'en_prueba' | 'descartada'
  modificada: boolean
  resultados: { fecha: string; realizada: boolean; nota: string }[]
  comentarios: { fecha: string; texto: string }[]
}

export type TipoMemoria = 'objetivo' | 'preferencia' | 'rutina_aceptada' | 'rutina_rechazada' | 'funciona' | 'no_funciona' | 'correccion' | 'consejo'

export type Memoria = {
  id: string
  usuarioId: string
  tipo: TipoMemoria
  texto: string
  creada: string
  fuente: 'chat' | 'rutina' | 'correccion'
}

export type Evidencia = { fecha: string; extracto: string }

export type Patron = {
  id: string
  usuarioId: string
  nombre: string
  observacion: string
  posibleRelacion: string
  evidencia: Evidencia[]
  fortalezas: string[]
  siguientePaso: string
  interpretacion?: 'correcta' | 'parcial' | 'incorrecta' | 'descartado'
  creado: string
}

export type Mensaje = { id: string; rol: 'usuario' | 'asistente'; texto: string; error?: boolean }

export type Nota = { id: string; creado: string; texto: string }

export type Estado = {
  usuarioId: string
  registros: Registro[]
  rutinas: Rutina[]
  memoria: Memoria[]
  patrones: Patron[]
  patronesError?: string
  patronesCreado?: string
  chat: Mensaje[]
  notas: Nota[]
  consentimiento: boolean
  contextoChat: boolean
}

const CLAVE = 'cuentame-tu-dia:v1'

export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function estadoInicial(): Estado {
  return {
    usuarioId: nuevoId(),
    registros: [],
    rutinas: [],
    memoria: [],
    patrones: [],
    chat: [],
    notas: [],
    consentimiento: false,
    contextoChat: false,
  }
}

type Guardado = Partial<Estado> & Record<string, unknown>

function migrar(guardado: Guardado): Estado {
  const base = estadoInicial()
  const usuarioId = typeof guardado.usuarioId === 'string' ? guardado.usuarioId : base.usuarioId
  const registros = Array.isArray(guardado.registros) ? (guardado.registros as Registro[]) : []
  return {
    ...base,
    usuarioId,
    registros: registros.map((r) => ({ ...r, usuarioId: r.usuarioId ?? usuarioId })),
    rutinas: Array.isArray(guardado.rutinas) ? (guardado.rutinas as Rutina[]) : [],
    memoria: Array.isArray(guardado.memoria) ? (guardado.memoria as Memoria[]) : [],
    patrones: Array.isArray(guardado.patrones)
      ? (guardado.patrones as Patron[]).map((p) => ({ ...p, usuarioId: p.usuarioId ?? usuarioId }))
      : [],
    patronesError: typeof guardado.patronesError === 'string' ? guardado.patronesError : undefined,
    patronesCreado: typeof guardado.patronesCreado === 'string' ? guardado.patronesCreado : undefined,
    chat: Array.isArray(guardado.chat) ? (guardado.chat as Mensaje[]) : [],
    notas: Array.isArray(guardado.notas) ? (guardado.notas as Nota[]) : [],
    consentimiento: guardado.consentimiento === true,
    contextoChat: guardado.contextoChat === true,
  }
}

export function cargarEstado(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? migrar(JSON.parse(crudo) as Guardado) : estadoInicial()
  } catch {
    return estadoInicial()
  }
}

export function guardarEstado(estado: Estado): void {
  localStorage.setItem(CLAVE, JSON.stringify(estado))
}

export function registrosDelUsuario(estado: Estado): Registro[] {
  return estado.registros.filter((r) => r.usuarioId === estado.usuarioId)
}

export function rutinasDelUsuario(estado: Estado): Rutina[] {
  return estado.rutinas.filter((r) => r.usuarioId === estado.usuarioId)
}

export function memoriaDelUsuario(estado: Estado): Memoria[] {
  return estado.memoria.filter((m) => m.usuarioId === estado.usuarioId)
}

export function fechaClave(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatearDiaCorto(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
}

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
