import type { Patron } from '../lib/datos'
import type { Props } from '../lib/vista'

const MINIMO_REGISTROS = 3

function fechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
}

const INTERPRETACIONES: { valor: NonNullable<Patron['interpretacion']>; etiqueta: string }[] = [
  { valor: 'correcta', etiqueta: 'Es correcta' },
  { valor: 'parcial', etiqueta: 'Es parcialmente correcta' },
  { valor: 'incorrecta', etiqueta: 'No es correcta' },
]

function Patrones({ estado, actualizar, ir }: Props) {
  const analisis = estado.analisis

  function fijarInterpretacion(id: string, valor: NonNullable<Patron['interpretacion']>) {
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) => (p.id === id ? { ...p, interpretacion: valor } : p)),
    }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Tu patrón identificado</h2>
        <p>Estas observaciones se basan solo en lo que escribiste. Son posibilidades para reflexionar, no conclusiones.</p>
      </header>

      {!analisis && (
        <section className="tarjeta vacio">
          <p>Aún no hay un análisis. Escribe tu día y pulsa "Analizar mi día".</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      )}

      {analisis && analisis.modo === 'demo' && (
        <p className="aviso aviso--demo">
          Demostración: este análisis usa reglas simuladas, no una IA real. Úsalo solo como ejemplo.
        </p>
      )}

      {analisis && analisis.registrosUsados < MINIMO_REGISTROS && (
        <section className="tarjeta">
          <p>Necesitas más registros para una comparación útil. Llevas {analisis.registrosUsados}.</p>
        </section>
      )}

      {analisis && analisis.registrosUsados >= MINIMO_REGISTROS && estado.patrones.length === 0 && (
        <section className="tarjeta vacio">
          <p>Por ahora no encontramos situaciones que se repitan en al menos dos días distintos.</p>
        </section>
      )}

      <ul className="lista">
        {estado.patrones.map((p) => (
          <li key={p.id} className="lista__item">
            <div className="fila-entre">
              <h3>{p.nombre}</h3>
              <span className={`insignia ${p.certeza === 'respaldado' ? 'insignia--fuerte' : ''}`}>
                {p.certeza === 'respaldado' ? 'Respaldado por varios registros' : 'Observación inicial'}
              </span>
            </div>

            <p>{p.observacion}</p>

            <p className="texto-pequeno">
              <strong>Evidencia:</strong> aparece en {p.evidencia.length} días distintos.
            </p>
            <ul className="evidencia">
              {p.evidencia.map((ev) => (
                <li key={ev.fecha}>
                  <strong>{fechaLarga(ev.fecha)}:</strong> "{ev.extracto}"
                </li>
              ))}
            </ul>

            <p>
              <strong>Posible efecto:</strong> {p.efecto}
            </p>

            <p className="texto-pequeno">¿Te parece correcta esta interpretación?</p>
            <div className="acciones">
              {INTERPRETACIONES.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  className={`btn btn--pequeno ${p.interpretacion === op.valor ? 'btn--activo' : 'btn--suave'}`}
                  aria-pressed={p.interpretacion === op.valor}
                  onClick={() => fijarInterpretacion(p.id, op.valor)}
                >
                  {op.etiqueta}
                </button>
              ))}
            </div>

            <div className="acciones">
              <button type="button" className="btn btn--principal btn--pequeno" onClick={() => ir('ciclo', p.id)}>
                Ver una propuesta para este patrón
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

export default Patrones
