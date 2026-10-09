export type Positivo = { texto: string; cita: string }

export type AnalisisDia = {
  creado: string
  resumen: string
  actividades: string[]
  emociones: string[]
  factores: string[]
  dificultades: string[]
  positivos: Positivo[]
  correccion?: string
}

export type Registro = {
  id: string
  creado: string
  texto: string
  analisis?: AnalisisDia
}

export type Alternativa = {
  titulo: string
  explicacion: string
  paso: string
  minutos: number
  pasos?: string[]
  porQue?: string
  problema?: string
  alternativaSimple?: string
  origen?: 'demo' | 'ia'
}

export type Evidencia = { fecha: string; extracto: string }

export type Patron = {
  id: string
  nombre: string
  observacion: string
  posibleRelacion: string
  certeza: 'inicial' | 'respaldado'
  evidencia: Evidencia[]
  fortalezas: string[]
  siguientePaso: string
  alternativas: Alternativa[]
  alternativaActual: number
  interpretacion?: 'correcta' | 'parcial' | 'incorrecta' | 'descartado'
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
  contextoChat: boolean
}

const CLAVE = 'cuentame-tu-dia:v1'

const ESTADO_INICIAL: Estado = {
  registros: [],
  patrones: [],
  acciones: [],
  chat: [],
  notas: [],
  consentimiento: false,
  contextoChat: false,
}

type PatronGuardado = Partial<Patron> & { efecto?: string }
type AccionGuardada = Omit<Accion, 'comentarios' | 'seguimientos'> & Partial<Pick<Accion, 'comentarios' | 'seguimientos'>>

function migrar(guardado: Partial<Estado>): Estado {
  const base = { ...ESTADO_INICIAL, ...guardado }
  return {
    ...base,
    patrones: ((base.patrones ?? []) as PatronGuardado[]).map((p) => ({
      ...p,
      posibleRelacion: p.posibleRelacion ?? p.efecto ?? '',
      fortalezas: p.fortalezas ?? [],
      siguientePaso: p.siguientePaso ?? '',
      alternativaActual: p.alternativaActual ?? 0,
      descartada: p.descartada ?? false,
    })) as Patron[],
    acciones: ((base.acciones ?? []) as AccionGuardada[]).map((a) => ({
      ...a,
      comentarios: a.comentarios ?? [],
      seguimientos: a.seguimientos ?? [],
    })),
    notas: base.notas ?? [],
    contextoChat: base.contextoChat ?? false,
  }
}

export function cargarEstado(): Estado {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? migrar(JSON.parse(crudo) as Partial<Estado>) : ESTADO_INICIAL
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

export function formatearDiaCorto(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
}

export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function diasAtras(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return fechaClave(d.toISOString())
}
