import { diasConRegistro } from '../lib/racha'
import { fechaClave, formatearDiaCorto, type Patron } from '../lib/datos'
import type { Props } from '../lib/vista'

type Interpretacion = NonNullable<Patron['interpretacion']>

const OPCIONES: { valor: Interpretacion; etiqueta: string }[] = [
  { valor: 'correcta', etiqueta: 'Es correcta' },
  { valor: 'parcial', etiqueta: 'Es parcialmente correcta' },
  { valor: 'incorrecta', etiqueta: 'No es correcta' },
  { valor: 'descartado', etiqueta: 'Descartar' },
]

function Patrones({ estado, actualizar, ir }: Props) {
  const analisis = estado.analisis
  const diasRegistrados = diasConRegistro(estado.registros).size
  const visibles = estado.patrones.filter((p) => p.interpretacion !== 'descartado')
  const descartados = estado.patrones.filter((p) => p.interpretacion === 'descartado')
  const ultimoConAnalisis = [...estado.registros]
    .filter((r) => r.analisis)
    .sort((a, b) => b.creado.localeCompare(a.creado))[0]

  function fijarInterpretacion(id: string, valor: Interpretacion | null) {
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) => (p.id === id ? { ...p, interpretacion: valor ?? undefined } : p)),
    }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Tu patrón identificado</h2>
        <p>Estas observaciones se basan en lo que escribiste. Son posibilidades para reflexionar, no conclusiones.</p>
      </header>

      {!analisis && (
        <section className="tarjeta vacio">
          <p>Aún no hay un análisis. Escribe tu día y pulsa "Analizar mi día".</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      )}

      {analisis?.modo === 'demo' && (
        <p className="aviso aviso--demo">
          Demostración: este análisis usa reglas simuladas y no una IA real.
        </p>
      )}

      {analisis && diasRegistrados < 2 && (
        <section className="tarjeta">
          <h3>Todavía no hay un patrón que confirmar</h3>
          <p>
            Solo tienes {diasRegistrados} día registrado. Un solo día no basta para confirmar un patrón que se repite. Cuando
            tengas registros de varios días, aquí los compararemos.
          </p>
          {ultimoConAnalisis?.analisis && (
            <div className="tarjeta tarjeta--suave">
              <p>
                <strong>Lo que observé en tu último día ({formatearDiaCorto(fechaClave(ultimoConAnalisis.creado))}):</strong>
              </p>
              <p>{ultimoConAnalisis.analisis.correccion ?? ultimoConAnalisis.analisis.resumen}</p>
              {ultimoConAnalisis.analisis.dificultades.length > 0 && (
                <p className="texto-pequeno">Dificultades que mencionaste: {ultimoConAnalisis.analisis.dificultades.join(', ')}.</p>
              )}
              {ultimoConAnalisis.analisis.positivos.length > 0 && (
                <p className="texto-pequeno">Aspectos positivos: {ultimoConAnalisis.analisis.positivos.map((p) => p.texto).join(', ')}.</p>
              )}
            </div>
          )}
        </section>
      )}

      {analisis && diasRegistrados >= 2 && visibles.length === 0 && (
        <section className="tarjeta vacio">
          <p>Por ahora no encontramos situaciones que se repitan en varios días. Eso también es una observación útil.</p>
        </section>
      )}

      <ul className="lista">
        {visibles.map((p) => (
          <li key={p.id} className="lista__item">
            <div className="fila-entre">
              <h3>{p.nombre}</h3>
              <span className={`insignia ${p.certeza === 'respaldado' ? 'insignia--fuerte' : ''}`}>
                {p.certeza === 'respaldado' ? 'Respaldado por varios registros' : 'Observación inicial'}
              </span>
            </div>

            <p>{p.observacion}</p>

            <p className="texto-pequeno">
              <strong>Frecuencia:</strong> observado en {p.evidencia.length} días distintos.
            </p>
            <p className="texto-pequeno">
              <strong>Evidencia:</strong>
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
              <button type="button" className="btn btn--principal btn--pequeno" onClick={() => ir('ciclo', p.id)}>
                Ver propuesta para este patrón
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
