import { useState, type ReactNode } from 'react'
import { fechaClave, formatearFecha, type Registro } from '../lib/datos'
import type { Props } from '../lib/vista'

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="registro__bloque">
      <p className="texto-pequeno">
        <strong>{titulo}</strong>
      </p>
      {children}
    </div>
  )
}

function Historial({ estado, actualizar, ir }: Props) {
  const registros = [...estado.registros].sort((a, b) => b.creado.localeCompare(a.creado))
  const [expandido, setExpandido] = useState<string | null>(null)

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return
    actualizar((e) => ({ ...e, registros: e.registros.filter((r) => r.id !== id) }))
  }

  function detallesDelDia(r: Registro) {
    const dia = fechaClave(r.creado)
    const patrones = estado.patrones.filter((p) => p.evidencia.some((ev) => ev.fecha === dia))
    const acciones = patrones.flatMap((p) => (p.alternativas[p.alternativaActual] ? [p.alternativas[p.alternativaActual]] : []))
    const seguimiento = estado.acciones.flatMap((a) =>
      a.seguimientos.filter((s) => fechaClave(s.fecha) === dia).map((s) => ({ accion: a.alternativa.titulo, ...s })),
    )
    return { patrones, acciones, seguimiento }
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
            const { patrones, acciones, seguimiento } = detallesDelDia(r)
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

                {r.emociones && r.emociones.length > 0 && (
                  <Bloque titulo="Emociones mencionadas">
                    {r.emociones.map((e) => (
                      <span key={e} className="insignia">
                        {e}
                      </span>
                    ))}
                  </Bloque>
                )}

                {r.factores && r.factores.length > 0 && (
                  <Bloque titulo="Factores asociados">
                    {r.factores.map((f) => (
                      <span key={f} className="insignia">
                        {f}
                      </span>
                    ))}
                  </Bloque>
                )}

                {patrones.length > 0 && (
                  <Bloque titulo="Patrones detectados">
                    <ul className="texto-pequeno">
                      {patrones.map((p) => (
                        <li key={p.id}>
                          {p.nombre} ·{' '}
                          {p.certeza === 'respaldado' ? 'respaldado por varios registros' : 'observación inicial'}
                        </li>
                      ))}
                    </ul>
                  </Bloque>
                )}

                {acciones.length > 0 && (
                  <Bloque titulo="Acciones sugeridas">
                    <ul className="texto-pequeno">
                      {acciones.map((a) => (
                        <li key={a.titulo}>
                          {a.titulo} ({a.minutos} min)
                        </li>
                      ))}
                    </ul>
                  </Bloque>
                )}

                {seguimiento.length > 0 && (
                  <Bloque titulo="Seguimiento de acciones">
                    <ul className="texto-pequeno">
                      {seguimiento.map((s) => (
                        <li key={`${s.fecha}-${s.accion}`}>
                          {s.accion}: {s.realizada ? 'la hiciste' : 'no la hiciste'}
                          {s.sensacion ? ` · ${s.sensacion}` : ''}
                        </li>
                      ))}
                    </ul>
                  </Bloque>
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
