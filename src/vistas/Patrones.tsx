import { useState } from 'react'
import { recalcularPatrones } from '../lib/flujos'
import { diasConRegistro } from '../lib/racha'
import { formatearDiaCorto, formatearFecha, registrosDelUsuario, type Patron } from '../lib/datos'
import type { Props } from '../lib/vista'

type Interpretacion = NonNullable<Patron['interpretacion']>

const OPCIONES: { valor: Interpretacion; etiqueta: string }[] = [
  { valor: 'correcta', etiqueta: 'Es correcta' },
  { valor: 'parcial', etiqueta: 'Es parcialmente correcta' },
  { valor: 'incorrecta', etiqueta: 'No es correcta' },
  { valor: 'descartado', etiqueta: 'Descartar' },
]

function Patrones({ estado, actualizar, ir }: Props) {
  const [recalculando, setRecalculando] = useState(false)
  const registros = registrosDelUsuario(estado)
  const dias = diasConRegistro(registros).size
  const patrones = estado.patrones.filter((p) => p.usuarioId === estado.usuarioId)
  const visibles = patrones.filter((p) => p.interpretacion !== 'descartado')
  const descartados = patrones.filter((p) => p.interpretacion === 'descartado')

  function fijarInterpretacion(id: string, valor: Interpretacion | null) {
    actualizar((e) => ({ ...e, patrones: e.patrones.map((p) => (p.id === id ? { ...p, interpretacion: valor ?? undefined } : p)) }))
  }

  async function recalcular() {
    setRecalculando(true)
    const r = await recalcularPatrones(estado)
    setRecalculando(false)
    if (r.ok) actualizar((e) => ({ ...e, patrones: [...e.patrones.filter((p) => p.usuarioId !== e.usuarioId), ...r.datos], patronesError: undefined, patronesCreado: new Date().toISOString() }))
    else actualizar((e) => ({ ...e, patronesError: r.mensaje }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Tu patrón identificado</h2>
        <p>Comparamos tus registros de distintos días. Son observaciones para reflexionar, no conclusiones.</p>
      </header>

      {dias < 2 && (
        <section className="tarjeta">
          <h3>Todavía no hay un patrón que confirmar</h3>
          <p>
            Tienes {dias} {dias === 1 ? 'día' : 'días'} registrados. Un solo día no basta para confirmar algo que se repite. Con
            registros de varios días aquí verás patrones con sus ejemplos.
          </p>
          <button type="button" className="btn btn--suave" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      )}

      {estado.patronesError && (
        <section className="aviso aviso--error">
          <p>No pudimos calcular tus patrones. {estado.patronesError} Tus registros siguen guardados.</p>
          <button type="button" className="btn btn--principal btn--pequeno" onClick={recalcular} disabled={recalculando}>
            {recalculando ? 'Calculando…' : 'Reintentar'}
          </button>
        </section>
      )}

      {dias >= 2 && !estado.patronesError && patrones.length === 0 && estado.patronesCreado && (
        <section className="tarjeta vacio">
          <p>Por ahora no encontramos situaciones que se repitan en varios días. Eso también es una observación útil.</p>
          <button type="button" className="btn btn--suave btn--pequeno" onClick={recalcular} disabled={recalculando}>
            Volver a revisar mis días
          </button>
        </section>
      )}

      {dias >= 2 && !estado.patronesCreado && !estado.patronesError && (
        <section className="tarjeta vacio">
          <p>Todavía no se ha calculado tu patrón. Puedes calcularlo ahora con tus registros.</p>
          <button type="button" className="btn btn--principal" onClick={recalcular} disabled={recalculando}>
            {recalculando ? 'Calculando…' : 'Calcular mi patrón'}
          </button>
        </section>
      )}

      {estado.patronesCreado && <p className="texto-pequeno">Calculado el {formatearFecha(estado.patronesCreado)} con {dias} días registrados.</p>}

      <ul className="lista">
        {visibles.map((p) => (
          <li key={p.id} className="lista__item">
            <div className="fila-entre">
              <h3>{p.nombre}</h3>
              <span className={`insignia ${p.evidencia.length >= 3 ? 'insignia--fuerte' : ''}`}>
                {p.evidencia.length >= 3 ? 'Respaldado por varios registros' : 'Observación inicial'}
              </span>
            </div>
            <p>{p.observacion}</p>
            <p className="texto-pequeno">
              <strong>Frecuencia:</strong> observado en {p.evidencia.length} días distintos.
            </p>
            <ul className="evidencia">
              {p.evidencia.map((ev) => (
                <li key={ev.fecha}>
                  <strong>{formatearDiaCorto(ev.fecha)}:</strong> "{ev.extracto}"
                </li>
              ))}
            </ul>
            {p.posibleRelacion && (
              <p>
                <strong>Posible relación:</strong> {p.posibleRelacion}
              </p>
            )}
            {p.fortalezas.length > 0 && (
              <p>
                <strong>Lo que ya te ayuda:</strong> {p.fortalezas.join('; ')}.
              </p>
            )}
            {p.siguientePaso && (
              <p>
                <strong>Siguiente paso posible:</strong> {p.siguientePaso}
              </p>
            )}
            <p className="texto-pequeno">¿Te parece correcta esta interpretación?</p>
            <div className="acciones">
              {OPCIONES.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  className={`btn btn--pequeno ${p.interpretacion === op.valor ? 'btn--activo' : op.valor === 'descartado' ? 'btn--peligro' : 'btn--suave'}`}
                  aria-pressed={p.interpretacion === op.valor}
                  onClick={() => fijarInterpretacion(p.id, op.valor)}
                >
                  {op.etiqueta}
                </button>
              ))}
            </div>
            <div className="acciones">
              <button type="button" className="btn btn--principal btn--pequeno" onClick={() => ir('ciclo')}>
                Ver rutinas
              </button>
            </div>
          </li>
        ))}
      </ul>

      {descartados.length > 0 && (
        <section className="tarjeta">
          <h3>Patrones descartados</h3>
          <ul className="texto-pequeno">
            {descartados.map((p) => (
              <li key={p.id} className="fila-entre">
                <span>{p.nombre}</span>
                <button type="button" className="btn btn--suave btn--pequeno" onClick={() => fijarInterpretacion(p.id, null)}>
                  Volver a mostrar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export default Patrones
