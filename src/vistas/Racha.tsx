import { diasConRegistro, calcularRachas, diasDelMes, mensajeHito, mensajeRacha } from '../lib/racha'
import type { Registro } from '../lib/datos'

export function Fuego({ encendido = true }: { encendido?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className={encendido ? 'fuego' : 'fuego fuego--apagado'}>
      <path
        d="M12 2c.5 3.2 4.5 5.4 4.5 10.2A4.5 4.5 0 0 1 12 16.5a4.5 4.5 0 0 1-4.5-4.3c0-1.8.9-3 2-4.1.2 1.6.9 2.6 1.9 3.1C11.1 7.4 11.4 4.8 12 2z"
        fill="currentColor"
      />
      <path
        d="M12 22a6 6 0 0 1-6-6c0-2.4 1.6-3.9 2.9-5 .2 1.2.7 2 1.5 2.5.3 1.9 1.3 3 2.6 3.7 1.9.2 3.6 1.9 3.6 3.8A6 6 0 0 1 12 22z"
        fill="#fff"
        fillOpacity="0.35"
      />
    </svg>
  )
}

export function BannerRacha({ registros, compacto = false }: { registros: Registro[]; compacto?: boolean }) {
  const { actual, maxima, registradoHoy } = calcularRachas(diasConRegistro(registros))
  const hito = registradoHoy ? mensajeHito(actual) : null

  return (
    <section className={`racha ${compacto ? 'racha--compacta' : ''}`} aria-label="Tu racha">
      <div className="racha__cifras">
        <Fuego encendido={actual > 0} />
        <div>
          <p className="racha__numero">
            <strong>{actual}</strong> {actual === 1 ? 'día' : 'días'} seguidos
          </p>
          <p className="texto-pequeno">
            Racha más larga: {maxima} {maxima === 1 ? 'día' : 'días'}
          </p>
        </div>
      </div>
      <p className="racha__mensaje">{mensajeRacha(actual, maxima)}</p>
      {hito && (
        <p className="aviso aviso--ok" role="status">
          {hito}
        </p>
      )}
    </section>
  )
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Calendario({
  registros,
  mes,
  año,
  onCambiar,
}: {
  registros: Registro[]
  mes: number
  año: number
  onCambiar: (mes: number, año: number) => void
}) {
  const marcados = diasConRegistro(registros)
  const nombre = new Date(año, mes, 1).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })

  function mover(delta: number) {
    const d = new Date(año, mes + delta, 1)
    onCambiar(d.getMonth(), d.getFullYear())
  }

  return (
    <div className="calendario">
      <div className="calendario__cabecera">
        <button type="button" className="btn btn--suave btn--pequeno" onClick={() => mover(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <strong className="capitalizada">{nombre}</strong>
        <button type="button" className="btn btn--suave btn--pequeno" onClick={() => mover(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className="calendario__rejilla">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="calendario__dia-semana">
            {d}
          </span>
        ))}
        {diasDelMes(año, mes).map((celda, i) =>
          celda ? (
            <span
              key={celda.fecha}
              className={`calendario__celda ${marcados.has(celda.fecha) ? 'calendario__celda--registrado' : ''}`}
              title={marcados.has(celda.fecha) ? 'Día registrado' : undefined}
            >
              {Number(celda.fecha.slice(8, 10))}
            </span>
          ) : (
            <span key={`vacio-${i}`} />
          ),
        )}
      </div>
      <p className="texto-pequeno">Los días marcados tienen un registro guardado.</p>
    </div>
  )
}
