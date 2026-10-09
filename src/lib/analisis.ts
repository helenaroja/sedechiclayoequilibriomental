import {
  fechaClave,
  normalizarTexto,
  nuevoId,
  type Alternativa,
  type Evidencia,
  type Patron,
  type Registro,
} from './datos'

export type PatronCrudo = {
  nombre: string
  observacion: string
  fechas: string[]
  extractos?: { fecha: string; cita: string }[]
  posibleRelacion: string
  fortalezas?: string[]
  siguientePaso?: string
  alternativas?: Alternativa[]
}

export type DiaCrudo = {
  fecha: string
  resumen: string
  actividades: string[]
  emociones: string[]
  factores: string[]
  dificultades: string[]
  positivos: { texto: string; cita: string }[]
}

const REGLAS: (Omit<PatronCrudo, 'fechas' | 'extractos' | 'posibleRelacion'> & { claves: string[]; efecto: string })[] = [
  {
    nombre: 'Acumulación de tareas',
    claves: ['ultimo momento', 'postergu', 'procrastin', 'dejé para', 'deje para', 'no empecé', 'no empece'],
    observacion: 'En varios registros mencionas dejar actividades para el último momento y después sentirte abrumado/a.',
    efecto: 'Podría indicar que te cuesta repartir las tareas durante la semana.',
    fortalezas: [],
    siguientePaso: 'Elige una sola tarea pendiente y dedícale diez minutos.',
    alternativas: [
      {
        titulo: 'Una sola tarea, diez minutos',
        explicacion: 'Elige una tarea pendiente y dedícale diez minutos, sin intentar resolver todo de golpe.',
        paso: 'Escribe la tarea y empieza por el primer paso visible.',
        minutos: 10,
        origen: 'demo',
      },
      {
        titulo: 'Bloque de planificación',
        explicacion: 'Antes de dormir, anota las tres tareas más importantes de mañana.',
        paso: 'Escribe tres tareas y el momento del día en que harás cada una.',
        minutos: 5,
        origen: 'demo',
      },
    ],
  },
  {
    nombre: 'Estrés al acumularse obligaciones',
    claves: ['estres', 'agobi', 'abrumad', 'presion', 'no doy más'],
    observacion: 'En varios registros describes estrés o sensación de agobio cuando se juntan varias obligaciones.',
    efecto: 'Podría relacionarse con momentos en que hay demasiadas cosas a la vez.',
    fortalezas: [],
    siguientePaso: 'Haz una pausa de respiración de dos minutos antes de la siguiente tarea.',
    alternativas: [
      {
        titulo: 'Pausa de respiración',
        explicacion: 'Antes de seguir con lo siguiente, toma una pausa breve para bajar la tensión.',
        paso: 'Inhala contando hasta cuatro, exhala contando hasta seis, durante dos minutos.',
        minutos: 2,
        origen: 'demo',
      },
      {
        titulo: 'Lista de lo que sí puedes hacer hoy',
        explicacion: 'Separa lo urgente de lo que puede esperar para ver el panorama con más claridad.',
        paso: 'Escribe tres cosas urgentes y deja el resto para otro día.',
        minutos: 5,
        origen: 'demo',
      },
    ],
  },
  {
    nombre: 'Aislamiento en momentos difíciles',
    claves: ['me aisl', 'aislad', 'no salí', 'no sali', 'nadie me', 'solo en casa', 'sola en casa'],
    observacion: 'En algunos registros mencionas evitar a otras personas cuando las cosas se ponen difíciles.',
    efecto: 'Podría indicar que, en esos momentos, prefieres estar solo/a aunque te gustaría sentir más compañía.',
    fortalezas: [],
    siguientePaso: 'Envía un mensaje breve a una persona de confianza.',
    alternativas: [
      {
        titulo: 'Un mensaje breve',
        explicacion: 'Escribe a una persona de confianza para contarle cómo estás, sin necesidad de explicar todo.',
        paso: 'Envía un mensaje corto: "Hoy fue un día pesado, ¿podemos hablar luego?"',
        minutos: 3,
        origen: 'demo',
      },
      {
        titulo: 'Un plan pequeño con alguien',
        explicacion: 'Propón una actividad sencilla y breve con alguien que conozcas.',
        paso: 'Invita a un compañero/a a caminar o tomar algo de 20 minutos.',
        minutos: 20,
        origen: 'demo',
      },
    ],
  },
  {
    nombre: 'Rutinas que se abandonan',
    claves: ['deje el gimnasio', 'me salte', 'no pude mantener', 'rutina se rompio'],
    observacion: 'Mencionas que dejas de lado rutinas que quieres mantener cuando tu día se complica.',
    efecto: 'Podría relacionarse con que las rutinas dependen demasiado de tener tiempo libre.',
    fortalezas: [],
    siguientePaso: 'Haz la versión más corta de tu rutina, aunque dure cinco minutos.',
    alternativas: [
      {
        titulo: 'Versión mínima de la rutina',
        explicacion: 'Mantén la rutina con una versión muy corta para no romper el hábito.',
        paso: 'Haz solo la parte más pequeña de tu rutina, aunque dure cinco minutos.',
        minutos: 5,
        origen: 'demo',
      },
      {
        titulo: 'Ancla en algo que ya haces',
        explicacion: 'Asocia la rutina a un momento fijo del día, como después de desayunar.',
        paso: 'Elige un momento fijo y realiza tu rutina mínima justo después.',
        minutos: 5,
        origen: 'demo',
      },
    ],
  },
]

const EMOCIONES_DEMO = [
  { etiqueta: 'Agobio', claves: ['abrumad', 'agobi', 'estres'] },
  { etiqueta: 'Cansancio', claves: ['cansad', 'agotad'] },
  { etiqueta: 'Tristeza', claves: ['triste', 'llore', 'llorar'] },
  { etiqueta: 'Ansiedad', claves: ['ansi', 'nervios'] },
  { etiqueta: 'Tranquilidad', claves: ['tranquil', 'relajad', 'contento', 'feliz'] },
]

const FACTORES_DEMO = [
  { etiqueta: 'Tareas o estudios', claves: ['tarea', 'examen', 'estudi', 'clase', 'trabajo del curso'] },
  { etiqueta: 'Familia', claves: ['mi mama', 'mi papa', 'familia', 'hermano', 'hermana'] },
  { etiqueta: 'Dinero', claves: ['dinero', 'plata', 'pagar'] },
  { etiqueta: 'Descanso', claves: ['dormi', 'sueno', 'insomnio'] },
]

function coincidentes(texto: string, lista: { etiqueta: string; claves: string[] }[]): string[] {
  const t = normalizarTexto(texto)
  return lista.filter((item) => item.claves.some((c) => t.includes(normalizarTexto(c)))).map((item) => item.etiqueta)
}

export function analizarDemo(registros: Registro[]): { patrones: PatronCrudo[]; dias: DiaCrudo[] } {
  const patrones: PatronCrudo[] = REGLAS.map((regla) => {
    const encontrados = registros.filter((r) =>
      regla.claves.some((clave) => normalizarTexto(r.texto).includes(normalizarTexto(clave))),
    )
    return {
      nombre: regla.nombre,
      observacion: regla.observacion,
      posibleRelacion: regla.efecto,
      fortalezas: regla.fortalezas,
      siguientePaso: regla.siguientePaso,
      alternativas: regla.alternativas,
      fechas: encontrados.map((r) => fechaClave(r.creado)),
      extractos: encontrados.map((r) => ({ fecha: fechaClave(r.creado), cita: r.texto })),
    }
  })

  const porDia = new Map<string, string>()
  for (const r of registros) {
    const clave = fechaClave(r.creado)
    porDia.set(clave, `${porDia.get(clave) ?? ''} ${r.texto}`)
  }
  const dias: DiaCrudo[] = [...porDia.entries()].map(([fecha, texto]) => ({
    fecha,
    resumen: '',
    actividades: [],
    emociones: coincidentes(texto, EMOCIONES_DEMO),
    factores: coincidentes(texto, FACTORES_DEMO),
    dificultades: [],
    positivos: [],
  }))

  return { patrones, dias }
}

function textos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []
}

export function aplicarAnalisis(registros: Registro[], dias: DiaCrudo[], creado: string): Registro[] {
  const porFecha = new Map(dias.filter((d) => typeof d?.fecha === 'string').map((d) => [d.fecha, d]))
  return registros.map((r) => {
    const dia = porFecha.get(fechaClave(r.creado))
    if (!dia) return r
    const positivos = (Array.isArray(dia.positivos) ? dia.positivos : [])
      .filter((p) => typeof p?.texto === 'string' && typeof p?.cita === 'string' && p.cita.trim() !== '' && r.texto.includes(p.cita.trim()))
      .map((p) => ({ texto: p.texto.trim(), cita: p.cita.trim() }))
    return {
      ...r,
      analisis: {
        creado,
        resumen: typeof dia.resumen === 'string' ? dia.resumen.trim() : '',
        actividades: textos(dia.actividades),
        emociones: textos(dia.emociones),
        factores: textos(dia.factores),
        dificultades: textos(dia.dificultades),
        positivos,
        correccion: r.analisis?.correccion,
      },
    }
  })
}

function recortar(texto: string): string {
  return texto.length > 160 ? `${texto.slice(0, 160).trimEnd()}…` : texto
}

export function normalizarPatrones(
  crudos: PatronCrudo[],
  registros: Registro[],
  modo: 'ia' | 'demo',
  previos: Patron[],
): Patron[] {
  const porDia = new Map<string, Registro[]>()
  for (const r of registros) {
    const clave = fechaClave(r.creado)
    porDia.set(clave, [...(porDia.get(clave) ?? []), r])
  }

  const resultado: Patron[] = []
  for (const crudo of crudos) {
    if (typeof crudo?.nombre !== 'string') continue
    const fechas = textos(crudo.fechas)
    const extractos = Array.isArray(crudo.extractos) ? crudo.extractos : []

    const evidencia: Evidencia[] = []
    for (const fecha of [...new Set(fechas)].sort()) {
      const delDia = porDia.get(fecha)
      const cita = extractos.find((e) => e?.fecha === fecha)?.cita?.trim()
      if (!delDia || !cita || !delDia.some((r) => r.texto.includes(cita))) continue
      evidencia.push({ fecha, extracto: recortar(cita) })
    }
    if (evidencia.length < 2) continue

    const previo = previos.find((p) => normalizarTexto(p.nombre) === normalizarTexto(crudo.nombre))
    const alternativasIA = previo?.alternativas.some((a) => a.origen === 'ia')
    const alternativas = alternativasIA ? previo!.alternativas : (Array.isArray(crudo.alternativas) ? crudo.alternativas : []).slice(0, 2)

    resultado.push({
      id: previo?.id ?? nuevoId(),
      nombre: crudo.nombre,
      observacion: typeof crudo.observacion === 'string' ? crudo.observacion : '',
      posibleRelacion: typeof crudo.posibleRelacion === 'string' ? crudo.posibleRelacion : '',
      certeza: evidencia.length >= 3 ? 'respaldado' : 'inicial',
      evidencia,
      fortalezas: textos(crudo.fortalezas),
      siguientePaso: typeof crudo.siguientePaso === 'string' ? crudo.siguientePaso : '',
      alternativas,
      alternativaActual: alternativasIA ? previo!.alternativaActual : 0,
      interpretacion: previo?.interpretacion,
      descartada: previo?.descartada ?? false,
      modo,
      creado: previo?.creado ?? new Date().toISOString(),
    })
  }
  return resultado
}
