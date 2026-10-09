import { fechaClave, nuevoId, normalizarTexto, type Alternativa, type Evidencia, type Patron, type Registro } from './datos'

export type PatronCrudo = {
  nombre: string
  observacion: string
  fechas: string[]
  extractos?: { fecha: string; cita: string }[]
  efecto: string
  alternativas: Alternativa[]
}

const REGLAS: (Omit<PatronCrudo, 'fechas' | 'extractos'> & { claves: string[] })[] = [
  {
    nombre: 'Acumulación de tareas',
    claves: ['ultimo momento', 'postergu', 'procrastin', 'dejé para', 'deje para', 'no empecé', 'no empece'],
    observacion:
      'En varios de tus registros mencionas dejar actividades para el último momento y después sentirte abrumado/a.',
    efecto: 'Podría indicar que te cuesta repartir las tareas durante la semana.',
    alternativas: [
      {
        titulo: 'Una sola tarea, diez minutos',
        explicacion: 'Elige una tarea pendiente y dedícale diez minutos, sin intentar resolver todo de golpe.',
        paso: 'Escribe la tarea y empieza por el primer paso visible.',
        minutos: 10,
      },
      {
        titulo: 'Bloque de planificación',
        explicacion: 'Antes de dormir, anota las tres tareas más importantes de mañana.',
        paso: 'Escribe tres tareas y el momento del día en que harás cada una.',
        minutos: 5,
      },
    ],
  },
  {
    nombre: 'Estrés al acumularse obligaciones',
    claves: ['estres', 'agobi', 'abrumad', 'presion', 'no doy más'],
    observacion: 'En varios registros describes estrés o sensación de agobio cuando se juntan varias obligaciones.',
    efecto: 'Podría relacionarse con momentos en que hay demasiadas cosas a la vez.',
    alternativas: [
      {
        titulo: 'Pausa de respiración',
        explicacion: 'Antes de seguir con lo siguiente, toma una pausa breve para bajar la tensión.',
        paso: 'Inhala contando hasta cuatro, exhala contando hasta seis, durante dos minutos.',
        minutos: 2,
      },
      {
        titulo: 'Lista de lo que sí puedes hacer hoy',
        explicacion: 'Separa lo urgente de lo que puede esperar para ver el panorama con más claridad.',
        paso: 'Escribe tres cosas urgentes y deja el resto para otro día.',
        minutos: 5,
      },
    ],
  },
  {
    nombre: 'Aislamiento en momentos difíciles',
    claves: ['me aisl', 'aislad', 'no salí', 'no sali', 'nadie me', 'solo en casa', 'sola en casa'],
    observacion: 'En algunos registros mencionas evitar a otras personas cuando las cosas se ponen difíciles.',
    efecto: 'Podría indicar que, en esos momentos, prefieres estar solo/a aunque te gustaría sentir más compañía.',
    alternativas: [
      {
        titulo: 'Un mensaje breve',
        explicacion: 'Escribe a una persona de confianza para contarle cómo estás, sin necesidad de explicar todo.',
        paso: 'Envía un mensaje corto: "Hoy fue un día pesado, ¿podemos hablar luego?"',
        minutos: 3,
      },
      {
        titulo: 'Un plan pequeño con alguien',
        explicacion: 'Propón una actividad sencilla y breve con alguien que conozcas.',
        paso: 'Invita a un compañero/a a caminar o tomar algo de 20 minutos.',
        minutos: 20,
      },
    ],
  },
  {
    nombre: 'Rutinas que se abandonan',
    claves: ['deje el gimnasio', 'me salte', 'no pude mantener', 'rutina se rompio'],
    observacion: 'Mencionas que dejas de lado rutinas que quieres mantener cuando tu día se complica.',
    efecto: 'Podría relacionarse con que las rutinas dependen demasiado de tener tiempo libre.',
    alternativas: [
      {
        titulo: 'Versión mínima de la rutina',
        explicacion: 'Mantén la rutina con una versión muy corta para no romper el hábito.',
        paso: 'Haz solo la parte más pequeña de tu rutina, aunque dure cinco minutos.',
        minutos: 5,
      },
      {
        titulo: 'Ancla en algo que ya haces',
        explicacion: 'Asocia la rutina a un momento fijo del día, como después de desayunar.',
        paso: 'Elige un momento fijo y realiza tu rutina mínima justo después.',
        minutos: 5,
      },
    ],
  },
]

export function analizarDemo(registros: Registro[]): PatronCrudo[] {
  return REGLAS.map((regla) => {
    const coincidentes = registros.filter((r) =>
      regla.claves.some((clave) => normalizarTexto(r.texto).includes(normalizarTexto(clave))),
    )
    return {
      nombre: regla.nombre,
      observacion: regla.observacion,
      efecto: regla.efecto,
      alternativas: regla.alternativas,
      fechas: coincidentes.map((r) => fechaClave(r.creado)),
      extractos: coincidentes.map((r) => ({ fecha: fechaClave(r.creado), cita: r.texto })),
    }
  })
}

function recortar(texto: string): string {
  return texto.length > 160 ? `${texto.slice(0, 160).trimEnd()}…` : texto
}

export function normalizarPatrones(crudos: PatronCrudo[], registros: Registro[], modo: 'ia' | 'demo'): Patron[] {
  const porDia = new Map<string, Registro[]>()
  for (const r of registros) {
    const clave = fechaClave(r.creado)
    porDia.set(clave, [...(porDia.get(clave) ?? []), r])
  }

  const resultado: Patron[] = []
  for (const crudo of crudos) {
    const fechas = Array.isArray(crudo.fechas) ? crudo.fechas : []
    const extractos = Array.isArray(crudo.extractos) ? crudo.extractos : []

    const evidencia: Evidencia[] = []
    for (const fecha of [...new Set(fechas)].sort()) {
      const delDia = porDia.get(fecha)
      const cita = extractos.find((e) => e.fecha === fecha)?.cita?.trim()
      if (!delDia || !cita || !delDia.some((r) => r.texto.includes(cita))) continue
      evidencia.push({ fecha, extracto: recortar(cita) })
    }

    if (evidencia.length < 2) continue

    resultado.push({
      id: nuevoId(),
      nombre: crudo.nombre,
      observacion: crudo.observacion,
      efecto: crudo.efecto,
      certeza: evidencia.length >= 3 ? 'respaldado' : 'inicial',
      evidencia,
      alternativas: Array.isArray(crudo.alternativas) ? crudo.alternativas.slice(0, 2) : [],
      alternativaActual: 0,
      descartada: false,
      modo,
      creado: new Date().toISOString(),
    })
  }
  return resultado
}
