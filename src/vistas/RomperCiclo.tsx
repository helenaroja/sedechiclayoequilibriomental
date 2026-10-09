import { useState } from 'react'
import { formatearFecha, nuevoId, type Accion } from '../lib/datos'
import type { Props } from '../lib/vista'

function RegistroAccion({ accion, actualizar }: { accion: Accion } & Pick<Props, 'actualizar'>) {
  const [realizada, setRealizada] = useState<boolean | null>(null)
  const [sensacion, setSensacion] = useState('')

  function cambiarEstado(nuevo: Accion['estado']) {
    actualizar((e) => ({
      ...e,
      acciones: e.acciones.map((a) => (a.id === accion.id ? { ...a, estado: nuevo } : a)),
    }))
  }

  function guardarSeguimiento() {
    if (realizada === null) return
    actualizar((e) => ({
      ...e,
      acciones: e.acciones.map((a) =>
        a.id === accion.id
          ? {
              ...a,
              seguimientos: [
                ...a.seguimientos,
                { fecha: new Date().toISOString(), realizada, sensacion: sensacion.trim() },
              ],
            }
          : a,
      ),
    }))
    setRealizada(null)
    setSensacion('')
  }

  return (
    <div className="lista__item">
      <p>
        <strong>Registrar cómo fue:</strong> ¿la pudiste hacer?
      </p>
      <div className="acciones">
        <button
          type="button"
          className={`btn btn--pequeno ${realizada === true ? 'btn--activo' : 'btn--suave'}`}
          aria-pressed={realizada === true}
          onClick={() => setRealizada(true)}
        >
          Sí, la hice
        </button>
        <button
          type="button"
          className={`btn btn--pequeno ${realizada === false ? 'btn--activo' : 'btn--suave'}`}
          aria-pressed={realizada === false}
          onClick={() => setRealizada(false)}
        >
          No pude hacerla
        </button>
      </div>
      <label className="texto-pequeno" style={{ display: 'block', marginTop: '0.75rem' }}>
        ¿Cómo te sentiste después?
        <input
          className="campo"
          type="text"
          value={sensacion}
          onChange={(e) => setSensacion(e.target.value)}
          placeholder="Por ejemplo: menos agobiado/a, igual, con más ganas…"
        />
      </label>
      <div className="acciones">
        <button type="button" className="btn btn--secundario btn--pequeno" onClick={guardarSeguimiento} disabled={realizada === null}>
          Guardar seguimiento
        </button>
        {accion.estado === 'probando' && (
          <>
            <button type="button" className="btn btn--suave btn--pequeno" onClick={() => cambiarEstado('completada')}>
              Marcar como completada
            </button>
            <button type="button" className="btn btn--suave btn--pequeno" onClick={() => cambiarEstado('pendiente')}>
              Dejar pendiente
            </button>
          </>
        )}
      </div>
      {accion.seguimientos.length > 0 && (
        <ul className="texto-pequeno">
          {accion.seguimientos.slice(-3).map((s) => (
            <li key={s.fecha}>
              {formatearFecha(s.fecha)}: {s.realizada ? 'la hiciste' : 'no la hiciste'}
              {s.sensacion ? ` · ${s.sensacion}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RomperCiclo({ estado, actualizar, ir, patronInicial }: Props) {
  const [seleccionado, setSeleccionado] = useState<string | undefined>(patronInicial)
  const [mensaje, setMensaje] = useState<string | null>(null)

  const patron = estado.patrones.find((p) => p.id === (seleccionado ?? patronInicial)) ?? estado.patrones[0]

  if (!patron) {
    return (
      <>
        <header className="encabezado-vista">
          <h2>Romper el ciclo</h2>
          <p>Cuando la IA identifique un patrón, aquí encontrarás una propuesta pequeña para probar.</p>
        </header>
        <section className="tarjeta vacio">
          <p>Todavía no hay patrones para trabajar.</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      </>
    )
  }

  const alternativa = patron.alternativas[patron.alternativaActual]
  const acciones = estado.acciones.filter((a) => a.patronId === patron.id)
  const enCurso = acciones.find((a) => a.estado === 'probando')

  function intentar() {
    if (!alternativa) return
    if (enCurso) {
      setMensaje('Ya estás probando una propuesta para este patrón. Regístrala abajo antes de iniciar otra.')
      return
    }
    actualizar((e) => ({
      ...e,
      acciones: [
        ...e.acciones,
        {
          id: nuevoId(),
          patronId: patron.id,
          patronNombre: patron.nombre,
          alternativa,
          estado: 'probando',
          seguimientos: [],
          creada: new Date().toISOString(),
        },
      ],
    }))
    setMensaje('Anotado. Cuando la pruebes, regístrala abajo para ver cómo te fue.')
  }

  function otraAlternativa() {
    if (patron.alternativas.length < 2) {
      setMensaje('Por ahora no tenemos otra alternativa para este patrón.')
      return
    }
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) =>
        p.id === patron.id
          ? { ...p, alternativaActual: (p.alternativaActual + 1) % p.alternativas.length, descartada: false }
          : p,
      ),
    }))
    setMensaje(null)
  }

  function noEsLoQueNecesito() {
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) => (p.id === patron.id ? { ...p, descartada: true } : p)),
    }))
    setMensaje('Gracias por decírnoslo. Puedes contarnos qué necesitas en el chat o escribir otro día.')
  }

  function verDeNuevo() {
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) => (p.id === patron.id ? { ...p, descartada: false } : p)),
    }))
    setMensaje(null)
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Romper el ciclo</h2>
        <p>Una acción pequeña para probar. Tú decides si la intentas y qué tan útil te resulta.</p>
      </header>

      {estado.patrones.length > 1 && (
        <div className="acciones" style={{ marginTop: 0, marginBottom: '1rem' }}>
          {estado.patrones.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn btn--pequeno ${p.id === patron.id ? 'btn--activo' : 'btn--suave'}`}
              onClick={() => {
                setSeleccionado(p.id)
                setMensaje(null)
              }}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      )}

      <section className="tarjeta">
        <p className="texto-pequeno">Patrón que quieres trabajar</p>
        <h3>{patron.nombre}</h3>

        {patron.descartada ? (
          <>
            <p>Esta propuesta no encaja contigo por ahora. Puedes contarnos qué necesitas en el chat o volver a verla.</p>
            <div className="acciones">
              <button type="button" className="btn btn--suave" onClick={verDeNuevo}>
                Volver a ver la propuesta
              </button>
              <button type="button" className="btn btn--suave" onClick={() => ir('chat')}>
                Hablar en el chat
              </button>
            </div>
          </>
        ) : alternativa ? (
          <>
            <div className="tarjeta tarjeta--suave">
              <p>
                <strong>Propuesta de cambio:</strong> {alternativa.explicacion}
              </p>
              <p>
                <strong>Acción concreta:</strong> {alternativa.paso}
              </p>
              <p>
                <strong>Tiempo estimado:</strong> {alternativa.minutos} minutos
              </p>
              <p className="texto-pequeno">
                <strong>Objetivo:</strong> comprobar si empezar con algo pequeño te ayuda a sentir menos saturación.
              </p>
            </div>

            <div className="acciones">
              <button type="button" className="btn btn--principal" onClick={intentar}>
                Quiero intentarlo
              </button>
              <button type="button" className="btn btn--secundario" onClick={otraAlternativa}>
                Probar otra alternativa
              </button>
              <button type="button" className="btn btn--peligro" onClick={noEsLoQueNecesito}>
                No es lo que necesito
              </button>
            </div>
          </>
        ) : null}

        {mensaje && <p className="aviso" role="status">{mensaje}</p>}
      </section>

      {acciones.length > 0 && (
        <section className="tarjeta">
          <h3>Acciones que has probado para este patrón</h3>
          <ul className="lista">
            {acciones.map((a) => (
              <li key={a.id} className="lista__item">
                <div className="fila-entre">
                  <strong>{a.alternativa.titulo}</strong>
                  <span className="insignia">
                    {a.estado === 'probando' ? 'En prueba' : a.estado === 'completada' ? 'Completada' : 'Pendiente'}
                  </span>
                </div>
                <p className="texto-pequeno">{a.alternativa.explicacion}</p>
                <RegistroAccion accion={a} actualizar={actualizar} />
              </li>
            ))}
          </ul>
          <p className="texto-pequeno">
            Registrar cómo te fue muestra tu experiencia personal. No demuestra que la acción haya causado un cambio.
          </p>
        </section>
      )}
    </>
  )
}

export default RomperCiclo
