import { useState, type ReactNode } from 'react'
import { procesarDia } from '../lib/flujos'
import { fechaClave, formatearFecha, nuevoId, registrosDelUsuario, rutinasDelUsuario, type AnalisisDia, type Registro } from '../lib/datos'
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

function Interpretacion({ analisis, onCorregir }: { analisis: AnalisisDia; onCorregir: (texto: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState(analisis.correccion ?? analisis.resumen)

  if (editando) {
    return (
      <Bloque titulo="Corregir la interpretación">
        <textarea className="campo-texto" style={{ minHeight: '110px' }} aria-label="Corregir interpretación" value={borrador} onChange={(e) => setBorrador(e.target.value)} />
        <div className="acciones">
          <button
            type="button"
            className="btn btn--principal btn--pequeno"
            onClick={() => {
              if (borrador.trim()) onCorregir(borrador.trim())
              setEditando(false)
            }}
          >
            Guardar corrección
          </button>
          <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </div>
      </Bloque>
    )
  }

  return (
    <Bloque titulo="Interpretación de tu día">
      <p>{analisis.correccion ?? analisis.resumen}</p>
      {analisis.correccion && <p className="texto-pequeno">Corregida por ti. Original: {analisis.resumen}</p>}
      <div className="acciones">
        <button
          type="button"
          className="btn btn--suave btn--pequeno"
          onClick={() => {
            setBorrador(analisis.correccion ?? analisis.resumen)
            setEditando(true)
          }}
        >
          Corregir interpretación
        </button>
      </div>
    </Bloque>
  )
}

function Historial({ estado, actualizar, ir }: Props) {
  const registros = [...registrosDelUsuario(estado)].sort((a, b) => b.creado.localeCompare(a.creado))
  const rutinas = rutinasDelUsuario(estado)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [reintentando, setReintentando] = useState<string | null>(null)

  function aplicar(actualizado: Registro) {
    actualizar((e) => ({ ...e, registros: e.registros.map((r) => (r.id === actualizado.id ? actualizado : r)) }))
  }

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este registro? No se puede deshacer.')) return
    actualizar((e) => ({ ...e, registros: e.registros.filter((r) => r.id !== id) }))
  }

  function corregir(registro: Registro, texto: string) {
    const fecha = fechaClave(registro.creado)
    aplicar({ ...registro, analisis: { ...registro.analisis!, correccion: texto } })
    actualizar((e) => ({
      ...e,
      memoria: [
        ...e.memoria,
        {
          id: nuevoId(),
          usuarioId: e.usuarioId,
          tipo: 'correccion',
          texto: `Corrigió la interpretación de su día del ${fecha}: "${texto.slice(0, 160)}"`,
          creada: new Date().toISOString(),
          fuente: 'correccion',
        },
      ],
    }))
  }

  async function reintentar(registro: Registro) {
    setReintentando(registro.id)
    const r = await procesarDia(estado, registro)
    setReintentando(null)
    aplicar(r.registro)
    if (r.rutina) actualizar((e) => ({ ...e, rutinas: [...e.rutinas, r.rutina!] }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Historial de tus días</h2>
        <p>
          {registros.length} registro(s) guardados en este navegador. Tu texto original siempre se conserva; la interpretación
          puedes corregirla.
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
            const a = r.analisis
            const rutinasDelDia = rutinas.filter((x) => x.registroId === r.id)
            const seguimiento = rutinas.flatMap((x) => x.resultados.filter((s) => fechaClave(s.fecha) === fechaClave(r.creado)).map((s) => ({ titulo: x.titulo, ...s })))
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
                    <Interpretacion analisis={a} onCorregir={(t) => corregir(r, t)} />
                    {a.actividades.length > 0 && (
                      <Bloque titulo="Actividades">
                        <Etiquetas items={a.actividades} />
                      </Bloque>
                    )}
                    {a.emociones.length > 0 && (
                      <Bloque titulo="Emociones expresadas">
                        <Etiquetas items={a.emociones} />
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
                              {p.texto} <span>(en tu relato: "{p.cita}")</span>
                            </li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                    {a.habitos.length > 0 && (
                      <Bloque titulo="Hábitos mencionados">
                        <ul className="texto-pequeno">
                          {a.habitos.map((h) => (
                            <li key={`${h.area}-${h.descripcion}`}>
                              <strong>{h.area}:</strong> {h.descripcion}
                            </li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                    {a.posiblesRelaciones.length > 0 && (
                      <Bloque titulo="Posibles relaciones (sin afirmar causa)">
                        <ul className="texto-pequeno">
                          {a.posiblesRelaciones.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                    {a.accionesSugeridas.length > 0 && (
                      <Bloque titulo="Acciones que podrían ayudar mañana">
                        <ul className="texto-pequeno">
                          {a.accionesSugeridas.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </Bloque>
                    )}
                  </>
                ) : (
                  <div className="aviso aviso--error registro__bloque">
                    <p>
                      <strong>Este día no tiene análisis.</strong> {r.errorAnalisis ?? 'Todavía no se ha analizado.'}
                    </p>
                    <button type="button" className="btn btn--principal btn--pequeno" onClick={() => reintentar(r)} disabled={reintentando !== null}>
                      {reintentando === r.id ? 'Analizando…' : 'Reintentar análisis'}
                    </button>
                  </div>
                )}

                {rutinasDelDia.length > 0 && (
                  <div className="acciones">
                    <button type="button" className="btn btn--suave btn--pequeno" onClick={() => ir('ciclo', r.id)}>
                      Ver la rutina de este día
                    </button>
                  </div>
                )}

                {seguimiento.length > 0 && (
                  <Bloque titulo="Seguimiento de la rutina">
                    <ul className="texto-pequeno">
                      {seguimiento.map((s) => (
                        <li key={`${s.fecha}-${s.titulo}`}>
                          {s.titulo}: {s.realizada ? 'la hiciste' : 'no te funcionó'}
                          {s.nota ? ` · ${s.nota}` : ''}
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
