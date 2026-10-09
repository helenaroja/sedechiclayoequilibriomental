import { useState, type ReactNode } from 'react'
import { fechaClave, formatearFecha, type AnalisisDia, type Registro } from '../lib/datos'
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

function Etiquetas({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <span key={item} className="insignia">
          {item}
        </span>
      ))}
    </>
  )
}

function Interpretacion({ analisis, onCorregir }: { analisis: AnalisisDia; onCorregir: (texto: string | null) => void }) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(analisis.correccion ?? analisis.resumen)

  function guardar() {
    const texto = borrador.trim()
    onCorregir(texto && texto !== analisis.resumen ? texto : null)
    setEditando(false)
  }

  return (
    <>
      {editando ? (
        <div className="registro__bloque">
          <textarea className="campo-texto" style={{ minHeight: '110px' }} aria-label="Corregir interpretación" value={borrador} onChange={(e) => setBorrador(e.target.value)} />
          <div className="acciones">
            <button type="button" className="btn btn--principal btn--pequeno" onClick={guardar}>
              Guardar corrección
            </button>
            <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <Bloque titulo="Interpretación de tu día">
          <p>{analisis.correccion ?? analisis.resumen}</p>
          {analisis.correccion && <p className="texto-pequeno">Corregida por ti. Original: {analisis.resumen}</p>}
          <div className="acciones">
            <button type="button" className="btn btn--suave btn--pequeno" onClick={() => { setBorrador(analisis.correccion ?? analisis.resumen); setEditando(true) }}>
              Corregir interpretación
            </button>
            {analisis.correccion && (
              <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => onCorregir(null)}>
                Quitar corrección
              </button>
            )}
          </div>
        </Bloque>
      )}
    </>
  )
}

function Historial({ estado, actualizar, ir }: Props) {
  const registros = [...estado.registros].sort((a, b) => b.creado.localeCompare(a.creado))
  const [expandido, setExpandido] = useState<string | null>(null)

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return
    actualizar((e) => ({ ...e, registros: e.registros.filter((r) => r.id !== id) }))
  }

  function corregir(id: string, texto: string | null) {
    actualizar((e) => ({
      ...e,
      registros: e.registros.map((r) =>
        r.id === id && r.analisis ? { ...r, analisis: { ...r.analisis, correccion: texto ?? undefined } } : r,
      ),
    }))
  }

  function detallesDelDia(r: Registro) {
    const dia = fechaClave(r.creado)
    const patrones = estado.patrones.filter((p) => p.interpretacion !== 'descartado' && p.evidencia.some((ev) => ev.fecha === dia))
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
          {registros.length} registro(s) guardados en este dispositivo. Tu texto original siempre se conserva; la
          interpretación puedes corregirla.
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
            const a = r.analisis
            return (
              <li key={r.id} className="lista__item">
                <div className="fila-entre">
                  <strong>{formatearFecha(r.creado)}</strong>
                  <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => eliminar(r.id)}>
                    Eliminar
                  </button>
                </div>

                <Bloque titulo="Tu relato">
                  <p className="registro__texto">{texto}</p>
                </Bloque>
                {largo && (
                  <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setExpandido(abierto ? null : r.id)}>
                    {abierto ? 'Mostrar menos' : 'Leer completo'}
                  </button>
                )}

                {a ? (
                  <>
                    <Interpretacion analisis={a} onCorregir={(t) => corregir(r.id, t)} />
                    {a.actividades.length > 0 && (
                      <Bloque titulo="Actividades">
                        <Etiquetas items={a.actividades} />
                      </Bloque>
                    )}
                    {a.emociones.length > 0 && (
                      <Bloque titulo="Emociones mencionadas">
                        <Etiquetas items={a.emociones} />
                      </Bloque>
                    )}
                    {a.factores.length > 0 && (
                      <Bloque titulo="Factores relacionados">
                        <Etiquetas items={a.factores} />
                      </Bloque>
                    )}
                    {a.dificultades.length > 0 && (
                      <Bloque titulo="Dificultades que describes">
                        <ul className="texto-pequeno">
                          {a.dificultades.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                    {a.positivos.length > 0 && (
                      <Bloque titulo="Aspectos positivos">
                        <ul className="texto-pequeno">
                          {a.positivos.map((p) => (
                            <li key={p.texto}>
                              {p.texto} <span className="texto-pequeno">(en tu relato: "{p.cita}")</span>
                            </li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                  </>
                ) : (
                  <p className="texto-pequeno registro__bloque">Este día todavía no tiene interpretación. Usa "Analizar mi día".</p>
                )}

                {patrones.length > 0 && (
                  <Bloque titulo="Patrones relacionados con este día">
                    <ul className="texto-pequeno">
                      {patrones.map((p) => (
                        <li key={p.id}>
                          {p.nombre} · {p.certeza === 'respaldado' ? 'respaldado por varios registros' : 'observación inicial'}
                        </li>
                      ))}
                    </ul>
                  </Bloque>
                )}

                {acciones.length > 0 && (
                  <Bloque titulo="Propuestas relacionadas">
                    <ul className="texto-pequeno">
                      {acciones.map((ac) => (
                        <li key={ac.titulo}>
                          {ac.titulo} ({ac.minutos} min)
                        </li>
                      ))}
                    </ul>
                  </Bloque>
                )}

                {seguimiento.length > 0 && (
                  <Bloque titulo="Seguimiento de propuestas">
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
