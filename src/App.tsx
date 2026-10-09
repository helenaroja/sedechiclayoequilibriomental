import { useEffect, useState } from 'react'
import { cargarEstado, guardarEstado, type Estado } from './lib/datos'
import type { Vista } from './lib/vista'
import Bienvenida from './vistas/Bienvenida'
import Escribir from './vistas/Escribir'
import Historial from './vistas/Historial'
import Patrones from './vistas/Patrones'
import RomperCiclo from './vistas/RomperCiclo'
import Seguimiento from './vistas/Seguimiento'
import Chat from './vistas/Chat'
import Privacidad from './vistas/Privacidad'

const NAVEGACION: { id: Vista; nombre: string }[] = [
  { id: 'escribir', nombre: 'Cuéntame tu día' },
  { id: 'historial', nombre: 'Historial' },
  { id: 'patrones', nombre: 'Tu patrón' },
  { id: 'ciclo', nombre: 'Romper el ciclo' },
  { id: 'seguimiento', nombre: 'Seguimiento' },
  { id: 'chat', nombre: 'Chat' },
  { id: 'privacidad', nombre: 'Mis datos' },
]

function App() {
  const [estado, setEstado] = useState<Estado>(cargarEstado)
  const [entrado, setEntrado] = useState(false)
  const [vista, setVista] = useState<Vista>('escribir')
  const [patronId, setPatronId] = useState<string | undefined>()

  useEffect(() => {
    guardarEstado(estado)
  }, [estado])

  if (!entrado) return <Bienvenida onEntrar={() => setEntrado(true)} />

  const ir = (destino: Vista, id?: string) => {
    setVista(destino)
    setPatronId(id)
    window.scrollTo({ top: 0 })
  }

  const props = { estado, actualizar: setEstado, ir, patronInicial: patronId }

  return (
    <div className="app">
      <header className="app__cabecera">
        <div className="app__barra">
          <span className="app__marca">Cuéntame tu día</span>
        </div>
        <nav className="app__nav" aria-label="Secciones">
          {NAVEGACION.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={vista === item.id ? 'page' : undefined}
              onClick={() => ir(item.id)}
            >
              {item.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="app__principal">
        {vista === 'escribir' && <Escribir {...props} />}
        {vista === 'historial' && <Historial {...props} />}
        {vista === 'patrones' && <Patrones {...props} />}
        {vista === 'ciclo' && <RomperCiclo {...props} />}
        {vista === 'seguimiento' && <Seguimiento {...props} />}
        {vista === 'chat' && <Chat {...props} />}
        {vista === 'privacidad' && <Privacidad {...props} />}
      </main>

      <footer className="pie-app">
        Herramienta de apoyo al bienestar y a la formación de hábitos. No reemplaza a un profesional de salud mental.
      </footer>
    </div>
  )
}

export default App
