export type Registro = {
  id: string
  creado: string
  texto: string
  emociones?: string[]
  factores?: string[]
}

export type Alternativa = { titulo: string; explicacion: string; paso: string; minutos: number }

export type Evidencia = { fecha: string; extracto: string }

export type Patron = {
  id: string
  nombre: string
  observacion: string
  efecto: string
  certeza: 'inicial' | 'respaldado'
  evidencia: Evidencia[]
  alternativas: Alternativa[]
  alternativaActual: number
  interpretacion?: 'correcta' | 'parcial' | 'incorrecta'
  descartada: boolean
  modo: 'ia' | 'demo'
  creado: string
}

export type Seguimiento = { fecha: string; realizada: boolean; sensacion: string }

export type Accion = {
  id: string
  patronId: string
  patronNombre: string
  alternativa: Alternativa
  estado: 'probando' | 'completada' | 'pendiente'
  seguimientos: Seguimiento[]
  comentarios: { fecha: string; texto: string }[]
  creada: string
}

export type Mensaje = { id: string; rol: 'usuario' | 'asistente'; texto: string }

export type Nota = { id: string; creado: string; texto: string }

export type UltimoAnalisis = { creado: string; registrosUsados: number; modo: 'ia' | 'demo' }

export type Estado = {
  registros: Registro[]
  patrones: Patron[]
  acciones: Accion[]
  chat: Mensaje[]
  notas: Nota[]
  analisis?: UltimoAnalisis
  consentimiento: boolean
}

const CLAVE = 'cuentame-tu-dia:v1'

const ESTADO_INICIAL: Estado = {
  registros: [],
  patrones: [],
  acciones: [],
  chat: [],
  notas: [],
  consentimiento: false,
}

export function cargarEstado(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? { ...ESTADO_INICIAL, ...(JSON.parse(crudo) as Partial<Estado>) } : ESTADO_INICIAL
  } catch {
    return ESTADO_INICIAL
  }
}

export function guardarEstado(estado: Estado): void {
  localStorage.setItem(CLAVE, JSON.stringify(estado))
}

export function nuevoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function fechaClave(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA')
}

export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return fechaClave(d.toISOString())
}
