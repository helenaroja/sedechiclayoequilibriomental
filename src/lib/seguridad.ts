import { normalizarTexto } from './datos'

const CLAVES_RIESGO = [
  'suicid',
  'quitarme la vida',
  'quitarme mi vida',
  'hacerme dano',
  'autolesi',
  'no quiero vivir',
  'acabar con mi vida',
  'matarme',
]

export function hayRiesgo(texto: string): boolean {
  const t = normalizarTexto(texto)
  return CLAVES_RIESGO.some((clave) => t.includes(normalizarTexto(clave)))
}
