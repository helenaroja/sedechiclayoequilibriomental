import { useState } from 'react'
import { formatearFecha } from '../lib/datos'
import type { Props } from '../lib/vista'

function Historial({ estado, actualizar, ir }: Props) {
  const registros = [...estado.registros].sort((a, b) => b.creado.localeCompare(a.creado))
  const [expandido, setExpandido] = useState<string | null>(null)

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return
    actualizar((e) => ({ ...e, registros: e.registros.filter((r) => r.id !== id) }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Historial de tus días</h2>
        <p>
          {registros.length} registro(s) guardados en este dispositivo. Puedes leerlos, eliminarlos o escribir uno nuevo.
        </p>
      </header>

      {registros.length === 0 ? (
        <section className="tarjeta vacio">
          <p>Aún no tienes registros guardados.</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      ) : (
        <ul className="lista">
          {registros.map((r) => {
            const abierto = expandido === r.id
            const largo = r.texto.length > 220
            const texto = abierto || !largo ? r.texto : `${r.texto.slice(0, 220).trimEnd()}…`
            return (
              <li key={r.id} className="lista__item">
                <div className="fila-entre">
                  <strong>{formatearFecha(r.creado)}</strong>
                  <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => eliminar(r.id)}>
                    Eliminar
                  </button>
                </div>
                <p className="registro__texto">{texto}</p>
                {largo && (
                  <button
                    type="button"
                    className="btn btn--suave btn--pequeno"
                    onClick={() => setExpandido(abierto ? null : r.id)}
                  >
                    {abierto ? 'Mostrar menos' : 'Leer completo'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export default Historial
