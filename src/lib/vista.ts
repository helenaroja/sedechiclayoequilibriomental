import type { Estado } from './datos'

export type Vista = 'escribir' | 'historial' | 'patrones' | 'ciclo' | 'seguimiento' | 'chat' | 'privacidad'

export type Props = {
  estado: Estado
  actualizar: (cambio: (estado: Estado) => Estado) => void
  ir: (vista: Vista, parametro?: string) => void
  parametro?: string
}
