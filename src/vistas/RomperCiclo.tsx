import { useState } from 'react'
import { proponerRutinaConIA, MENSAJE_ERROR_TECNICO, type RespuestaRutina } from '../lib/api'
import { fechaClave, formatearFecha, formatearDiaCorto, nuevoId, type Accion, type Alternativa, type Patron } from '../lib/datos'
import type { Props } from '../lib/vista'

type Instruccion = 'nueva' | 'mas_simple' | 'otra'

function desdeRutina(r: RespuestaRutina): Alternativa {
  const pasos = Array.isArray(r.pasos) ? r.pasos.filter((p) => typeof p === 'string' && p.trim()) : []
  return {
    titulo: r.titulo,
    explicacion: r.porQue,
    paso: pasos.join(' → '),
    minutos: Number.isFinite(r.duracionMinutos) ? r.duracionMinutos : 10,
    pasos,
    porQue: r.porQue,
    problema: r.problema,
    alternativaSimple: r.alternativaSimple,
    origen: 'ia',
  }
}

function RegistroAccion({ accion, actualizar }: { accion: Accion; actualizar: Props['actualizar'] }) {
  const [realizada, setRealizada] = useState<boolean | null>(null)
  const [sensacion, setSensacion] = useState('')

  function cambiarEstado(nuevo: Accion['estado']) {
    actualizar((e) => ({ ...e, acciones: e.acciones.map((a) => (a.id === accion.id ? { ...a, estado: nuevo } : a)) }))
  }

  function guardarSeguimiento() {
    if (realizada === null) return
    actualizar((e) => ({
      ...e,
      acciones: e.acciones.map((a) =>
        a.id === accion.id
          ? { ...a, seguimientos: [...a.seguimientos, { fecha: new Date().toISOString(), realizada, sensacion: sensacion.trim() }] }
          : a,
      ),
    }))
    setRealizada(null)
    setSensacion('')
  }

  return (
    <div className="lista__item">
      <p>
        <strong>¿Cómo fue?</strong> Registra si la intentaste y cómo te sentiste.
      </p>
      <div className="acciones">
        <button type="button" className={`btn btn--pequeno ${realizada === true ? 'btn--activo' : 'btn--suave'}`} aria-pressed={realizada === true} onClick={() => setRealizada(true)}>
          Sí, la intenté
        </button>
        <button type="button" className={`btn btn--pequeno ${realizada === false ? 'btn--activo' : 'btn--suave'}`} aria-pressed={realizada === false} onClick={() => setRealizada(false)}>
          No pude hacerla
        </button>
      </div>
      <label className="texto-pequeno" style={{ display: 'block', marginTop: '0.75rem' }}>
        ¿Cómo te fue o cómo te sentiste después?
        <input className="campo" type="text" value={sensacion} onChange={(e) => setSensacion(e.target.value)} placeholder="Por ejemplo: me costó menos empezar, o no tuve tiempo…" />
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
              {formatearFecha(s.fecha)}: {s.realizada ? 'la intentaste' : 'no la pudiste hacer'}
              {s.sensacion ? ` · ${s.sensacion}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RomperCiclo({ estado, actualizar, ir, patronInicial }: Props) {
  const disponibles = estado.patrones.filter((p) => p.interpretacion !== 'descartado')
  const [seleccionado, setSeleccionado] = useState<string | undefined>(patronInicial)
  const [mensaje, setMensaje] = useState<{ tipo: 'info' | 'error'; texto: string } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [pasosEditados, setPasosEditados] = useState('')

  const patron: Patron | undefined = disponibles.find((p) => p.id === (seleccionado ?? patronInicial)) ?? disponibles[0]

  if (!patron) {
    return (
      <>
        <header className="encabezado-vista">
          <h2>Romper el ciclo</h2>
          <p>Cuando haya un patrón que confirmar, aquí encontrarás una propuesta hecha a partir de lo que escribiste.</p>
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

  const propuesta = patron.alternativas[patron.alternativaActual]
  const esIA = propuesta?.origen === 'ia'
  const acciones = estado.acciones.filter((a) => a.patronId === patron.id)
  const enCurso = acciones.find((a) => a.estado === 'probando')

  function aplicarPropuesta(alternativas: Alternativa[], actual = 0) {
    actualizar((e) => ({
      ...e,
      patrones: e.patrones.map((p) => (p.id === patron!.id ? { ...p, alternativas, alternativaActual: actual, descartada: false } : p)),
    }))
  }

  async function generar(instruccion: Instruccion) {
    setCargando(true)
    setMensaje(null)
    const respuesta = await proponerRutinaConIA(
      { nombre: patron!.nombre, observacion: patron!.observacion, evidencia: patron!.evidencia },
      estado.registros,
      instruccion,
    )
    setCargando(false)

    if (respuesta.modo === 'ia') {
      aplicarPropuesta([desdeRutina(respuesta.datos)])
      return
    }
    if (respuesta.modo === 'demo') {
      setMensaje({ tipo: 'info', texto: 'Sin IA disponible en este momento: mostramos propuestas fijas de demostración.' })
      return
    }
    setMensaje({ tipo: 'error', texto: respuesta.mensaje || MENSAJE_ERROR_TECNICO })
  }

  function intentar() {
    if (!propuesta) return
    if (enCurso) {
      setMensaje({ tipo: 'info', texto: 'Ya estás probando una propuesta para este patrón. Regístrala abajo antes de iniciar otra.' })
      return
    }
    actualizar((e) => ({
      ...e,
      acciones: [
        ...e.acciones,
        {
          id: nuevoId(),
          patronId: patron!.id,
          patronNombre: patron!.nombre,
          alternativa: propuesta,
          estado: 'probando',
          seguimientos: [],
          comentarios: [],
          creada: new Date().toISOString(),
        },
      ],
    }))
    setMensaje({ tipo: 'info', texto: 'Anotado. Cuando la pruebes, regístrala abajo para ver cómo te fue.' })
  }

  function otra() {
    if (esIA) {
      void generar('otra')
      return
    }
    if (patron!.alternativas.length < 2) {
      setMensaje({ tipo: 'info', texto: 'Por ahora no tenemos otra propuesta de demostración para este patrón.' })
      return
    }
    aplicarPropuesta(patron!.alternativas, (patron!.alternativaActual + 1) % patron!.alternativas.length)
  }

  function rechazar() {
    actualizar((e) => ({ ...e, patrones: e.patrones.map((p) => (p.id === patron!.id ? { ...p, descartada: true } : p)) }))
    setMensaje({ tipo: 'info', texto: 'Gracias por decírnoslo. Puedes pedir otra propuesta o contarnos qué necesitas en el chat.' })
  }

  function guardarEdicion() {
    if (!propuesta) return
    const pasos = pasosEditados.split('\n').map((p) => p.trim()).filter(Boolean)
    if (pasos.length === 0) return
    const modificada: Alternativa = { ...propuesta, pasos, paso: pasos.join(' → ') }
    const nuevas = patron!.alternativas.map((a, i) => (i === patron!.alternativaActual ? modificada : a))
    aplicarPropuesta(nuevas, patron!.alternativaActual)
    setEditando(false)
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Romper el ciclo</h2>
        <p>Una propuesta pequeña, basada en lo que escribiste. Tú decides si la intentas, la cambias o la descartas.</p>
      </header>

      {disponibles.length > 1 && (
        <div className="acciones" style={{ marginTop: 0, marginBottom: '1rem' }}>
          {disponibles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`btn btn--pequeno ${p.id === patron.id ? 'btn--activo' : 'btn--suave'}`}
              onClick={() => {
                setSeleccionado(p.id)
                setMensaje(null)
                setEditando(false)
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
        <p className="texto-pequeno">{patron.observacion}</p>

        {patron.descartada ? (
          <>
            <p>Esta propuesta no encaja contigo por ahora. Puedes volver a verla, pedir una distinta o contarnos qué necesitas en el chat.</p>
            <div className="acciones">
              <button type="button" className="btn btn--suave" onClick={() => aplicarPropuesta(patron.alternativas, patron.alternativaActual)}>
                Volver a ver la propuesta
              </button>
              <button type="button" className="btn btn--principal" onClick={() => generar('otra')} disabled={cargando}>
                Pedir otra propuesta
              </button>
              <button type="button" className="btn btn--suave" onClick={() => ir('chat')}>
                Hablar en el chat
              </button>
            </div>
          </>
        ) : !propuesta ? (
          <div className="acciones">
            <button type="button" className="btn btn--principal" onClick={() => generar('nueva')} disabled={cargando}>
              Crear propuesta personalizada
            </button>
          </div>
        ) : editando ? (
          <div className="tarjeta tarjeta--suave">
            <p>
              <strong>Modifica los pasos</strong> (uno por línea):
            </p>
            <textarea className="campo-texto" style={{ minHeight: '140px' }} aria-label="Pasos de la propuesta" value={pasosEditados} onChange={(e) => setPasosEditados(e.target.value)} />
            <div className="acciones">
              <button type="button" className="btn btn--principal btn--pequeno" onClick={guardarEdicion}>
                Guardar cambios
              </button>
              <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="tarjeta tarjeta--suave">
              <h3>{propuesta.titulo}</h3>
              {propuesta.problema && (
                <p>
                  <strong>Lo que observé:</strong> {propuesta.problema}
                </p>
              )}
              {propuesta.porQue && (
                <p>
                  <strong>Por qué podría ayudar:</strong> {propuesta.porQue}
                </p>
              )}
              {!propuesta.porQue && (
                <p>
                  <strong>Propuesta de cambio:</strong> {propuesta.explicacion}
                </p>
              )}
              {propuesta.pasos && propuesta.pasos.length > 0 ? (
                <ol>
                  {propuesta.pasos.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              ) : (
                <p>
                  <strong>Acción concreta:</strong> {propuesta.paso}
                </p>
              )}
              <p>
                <strong>Duración aproximada:</strong> {propuesta.minutos} minutos
              </p>
              {propuesta.alternativaSimple && (
                <p className="texto-pequeno">
                  <strong>Si es un día difícil:</strong> {propuesta.alternativaSimple}
                </p>
              )}
              {propuesta.origen === 'demo' && <p className="texto-pequeno">Propuesta de demostración, no generada con IA.</p>}
            </div>

            <div className="acciones">
              <button type="button" className="btn btn--principal" onClick={intentar}>
                Aceptar y probar
              </button>
              <button
                type="button"
                className="btn btn--secundario"
                onClick={() => {
                  setPasosEditados((propuesta.pasos ?? [propuesta.paso]).join('\n'))
                  setEditando(true)
                }}
              >
                Modificar
              </button>
              {esIA ? (
                <button type="button" className="btn btn--suave" onClick={() => generar('mas_simple')} disabled={cargando}>
                  Pedir una versión más sencilla
                </button>
              ) : (
                <button type="button" className="btn btn--suave" onClick={otra} disabled={cargando}>
                  Probar otra alternativa
                </button>
              )}
              <button type="button" className="btn btn--peligro" onClick={rechazar}>
                No es lo que necesito
              </button>
            </div>
            {esIA && (
              <div className="acciones">
                <button type="button" className="btn btn--suave btn--pequeno" onClick={() => generar('otra')} disabled={cargando}>
                  Pedir otra propuesta
                </button>
              </div>
            )}
          </>
        )}

        {cargando && <p className="cargando">Preparando una propuesta a partir de tus registros…</p>}
        {mensaje && (
          <p role="status" className={`aviso ${mensaje.tipo === 'error' ? 'aviso--error' : ''}`}>
            {mensaje.texto}
          </p>
        )}
      </section>

      {acciones.length > 0 && (
        <section className="tarjeta">
          <h3>Propuestas que has probado para este patrón</h3>
          <ul className="lista">
            {acciones.map((a) => (
              <li key={a.id} className="lista__item">
                <div className="fila-entre">
                  <strong>{a.alternativa.titulo}</strong>
                  <span className="insignia">{a.estado === 'probando' ? 'En prueba' : a.estado === 'completada' ? 'Completada' : 'Pendiente'}</span>
                </div>
                <p className="texto-pequeno">Iniciada el {formatearDiaCorto(fechaClave(a.creada))}.</p>
                <RegistroAccion accion={a} actualizar={actualizar} />
              </li>
            ))}
          </ul>
          <p className="texto-pequeno">
            Registrar cómo te fue refleja tu experiencia. No demuestra por sí solo que la propuesta haya causado un cambio.
          </p>
        </section>
      )}
    </>
  )
}

export default RomperCiclo
