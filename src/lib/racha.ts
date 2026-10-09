import { fechaClave, type Registro } from './datos'

export const HITOS = [3, 7, 14, 30]

export function hoyLocal(): string {
  return fechaClave(new Date().toISOString())
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + n)
  return fechaClave(d.toISOString())
}

export function diasConRegistro(registros: Registro[]): Set<string> {
  return new Set(registros.map((r) => fechaClave(r.creado)))
}

export function calcularRachas(dias: Set<string>, hoy: string = hoyLocal()) {
  const ordenados = [...dias].sort()
  let maxima = 0
  let corrida = 0
  let anterior: string | null = null
  for (const fecha of ordenados) {
    corrida = anterior !== null && sumarDias(anterior, 1) === fecha ? corrida + 1 : 1
    maxima = Math.max(maxima, corrida)
    anterior = fecha
  }

  let actual = 0
  const inicio = dias.has(hoy) ? hoy : dias.has(sumarDias(hoy, -1)) ? sumarDias(hoy, -1) : null
  if (inicio) {
    let cursor = inicio
    while (dias.has(cursor)) {
      actual++
      cursor = sumarDias(cursor, -1)
    }
  }

  return { actual, maxima, registradoHoy: dias.has(hoy) }
}

export function mensajeHito(actual: number): string | null {
  if (actual === 3) return '¡3 días seguidos! Estás creando el hábito de escribir sobre tu día.'
  if (actual === 7) return '¡Una semana completa! Tu constancia ya se nota.'
  if (actual === 14) return '¡14 días seguidos! Dos semanas de registros: buen trabajo.'
  if (actual === 30) return '¡30 días! Un mes de constancia que dice mucho de ti.'
  return null
}

export function mensajeRacha(actual: number, maxima: number): string {
  if (actual > 0) return `Llevas ${actual} ${actual === 1 ? 'día' : 'días'} seguidos registrando tu día.`
  if (maxima > 0) return 'Empezar de nuevo también cuenta. Escribe tu día cuando quieras.'
  return 'Escribe tu primer día para empezar tu racha. Cada registro cuenta.'
}

export function diasDelMes(año: number, mes: number): ({ fecha: string } | null)[] {
  const primero = new Date(año, mes, 1, 12)
  const huecos = (primero.getDay() + 6) % 7
  const total = new Date(año, mes + 1, 0).getDate()
  const celdas: ({ fecha: string } | null)[] = Array.from({ length: huecos }, () => null)
  for (let dia = 1; dia <= total; dia++) {
    const d = new Date(año, mes, dia, 12)
    celdas.push({ fecha: fechaClave(d.toISOString()) })
  }
  return celdas
}
