import { useState } from 'react'
import { pedirAlternativa, reintentarRutina } from '../lib/flujos'
import { formatearFecha, formatearDiaCorto, fechaClave, nuevoId, registrosDelUsuario, rutinasDelUsuario, type Estado, type Memoria, type Registro, type Rutina } from '../lib/datos'
import type { Props } from '../lib/vista'

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null

function agregarMemoria(e: Estado, tipo: Memoria['tipo'], texto: string, fuente: Memoria['fuente']): Estado {
  return {
    ...e,
    memoria: [...e.memoria, { id: nuevoId(), usuarioId: e.usuarioId, tipo, texto, creada: new Date().toISOString(), fuente }],
  }
}

function RomperCiclo({ estado, actualizar, ir, parametro }: Props) {
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  const [editando, setEditando] = useState(false)
  const [pasosEditados, setPasosEditados] = useState('')
  const [nota, setNota] = useState('')

  const registros = registrosDelUsuario(estado)
  const rutinas = [...rutinasDelUsuario(estado)].sort((a, b) => b.creada.localeCompare(a.creada))
  const conAnalisis = registros.filter((r) => r.analisis).sort((a, b) => b.creado.localeCompare(a.creado))

  const registro: Registro | undefined =
    registros.find((r) => r.id === parametro) ?? conAnalisis.find((r) => r.rutinaId) ?? conAnalisis[0]
  const rutina: Rutina | undefined = registro?.rutinaId
    ? rutinas.find((x) => x.id === registro.rutinaId)
    : undefined
  const otras = rutinas.filter((x) => x.id !== rutina?.id)

  function actualizarRutina(id: string, cambio: (r: Rutina) => Rutina) {
    actualizar((e) => ({ ...e, rutinas: e.rutinas.map((r) => (r.id === id ? cambio(r) : r)) }))
  }

  function probar(r: Rutina) {
    actualizar((e) => {
      const conCambio = {
        ...e,
        rutinas: e.rutinas.map((x) => (x.id === r.id ? { ...x, estado: 'en_prueba' as const } : x)),
      }
      return agregarMemoria(conCambio, 'rutina_aceptada', `Decidió probar la rutina "${r.titulo}".`, 'rutina')
    })
    setAviso({ tipo: 'ok', texto: 'Rutina en prueba. Cuando la hagas, márcala como realizada aquí.' })
  }

  function descartar(r: Rutina) {
    actualizar((e) => {
      const conCambio = {
        ...e,
        rutinas: e.rutinas.map((x) => (x.id === r.id ? { ...x, estado: 'descartada' as const } : x)),
      }
      return agregarMemoria(conCambio, 'rutina_rechazada', `Descartó la rutina "${r.titulo}".`, 'rutina')
    })
    setAviso({ tipo: 'ok', texto: 'Rutina descartada. Podemos pedir una alternativa cuando quieras.' })
  }

  function registrar(r: Rutina, realizada: boolean) {
    const texto = nota.trim()
    actualizar((e) => {
      const conResultado = {
        ...e,
        rutinas: e.rutinas.map((x) =>
          x.id === r.id ? { ...x, resultados: [...x.resultados, { fecha: new Date().toISOString(), realizada, nota: texto }] } : x,
        ),
      }
      if (realizada) return conResultado
      const detalle = texto ? `: ${texto}` : ''
      return agregarMemoria(conResultado, 'no_funciona', `A la rutina "${r.titulo}" no le funcionó${detalle}.`, 'rutina')
    })
    setNota('')
    setAviso({ tipo: 'ok', texto: realizada ? 'Anotado: hiciste la rutina.' : 'Anotado. Gracias por contarlo; lo usaremos para ajustar las próximas propuestas.' })
  }

  function guardarEdicion(r: Rutina) {
    const pasos = pasosEditados.split('\n').map((p) => p.trim()).filter(Boolean)
    if (pasos.length === 0) return
    actualizarRutina(r.id, (x) => ({ ...x, pasos, modificada: true }))
    setEditando(false)
    setAviso({ tipo: 'ok', texto: 'Cambios guardados en tu rutina.' })
  }

  async function alternativa(r: Rutina) {
    if (!registro) return
    setOcupado(true)
    const res = await pedirAlternativa(estado, registro, r)
    setOcupado(false)
    if (!res.ok) {
      setAviso({ tipo: 'error', texto: `No se pudo generar una alternativa. ${res.mensaje}` })
      return
    }
    actualizar((e) => ({
      ...e,
      rutinas: [...e.rutinas.map((x) => (x.id === r.id ? { ...x, estado: 'descartada' as const } : x)), res.datos],
      registros: e.registros.map((x) => (x.id === registro.id ? { ...x, rutinaId: res.datos.id, errorRutina: undefined } : x)),
    }))
    setAviso({ tipo: 'ok', texto: 'Te propongo una alternativa distinta.' })
  }

  async function reintentar() {
    if (!registro) return
    setOcupado(true)
    const res = await reintentarRutina(estado, registro)
    setOcupado(false)
    actualizar((e) => ({
      ...e,
      registros: e.registros.map((x) => (x.id === registro.id ? res.registro : x)),
      rutinas: res.rutina ? [...e.rutinas, res.rutina] : e.rutinas,
    }))
    setAviso(res.rutina ? { tipo: 'ok', texto: 'Rutina generada.' } : { tipo: 'error', texto: `La rutina no se pudo generar. ${res.registro.errorRutina ?? ''}` })
  }

  if (!registro) {
    return (
      <>
        <header className="encabezado-vista">
          <h2>Romper el ciclo</h2>
          <p>Aquí aparecen las rutinas que se crean a partir de tu análisis diario.</p>
        </header>
        <section className="tarjeta vacio">
          <p>Primero necesitamos que completes un día. Cuando lo analicemos, aquí aparecerá una rutina para ese día.</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      </>
    )
  }

  const fechaRegistro = formatearDiaCorto(fechaClave(registro.creado))

  return (
    <>
      <header className="encabezado-vista">
        <h2>Romper el ciclo</h2>
        <p>Una rutina pequeña, creada a partir de lo que describiste. Tú decides si la pruebas, la cambias o la descartas.</p>
      </header>

      {aviso && (
        <p role="status" className={`aviso ${aviso.tipo === 'error' ? 'aviso--error' : 'aviso--ok'}`}>
          {aviso.texto}
        </p>
      )}

      <section className="tarjeta">
        <p className="texto-pequeno">Basada en tu día del {fechaRegistro}</p>

        {rutina ? (
          <>
            <h3>{rutina.titulo}</h3>
            <p className="texto-pequeno">
              Estado:{' '}
              {rutina.estado === 'en_prueba' ? 'en prueba' : rutina.estado === 'descartada' ? 'descartada' : 'propuesta'}
              {rutina.modificada ? ' · modificada por ti' : ''}
            </p>

            <div className="tarjeta tarjeta--suave">
              <p>
                <strong>Lo que observé en tu día:</strong> {rutina.patronObservado}
              </p>
              <p>
                <strong>Por qué podría ayudar:</strong> {rutina.porQue}
              </p>

              {editando ? (
                <>
                  <p>
                    <strong>Modifica los pasos</strong> (uno por línea):
                  </p>
                  <textarea className="campo-texto" style={{ minHeight: '140px' }} aria-label="Pasos de la rutina" value={pasosEditados} onChange={(e) => setPasosEditados(e.target.value)} />
                  <div className="acciones">
                    <button type="button" className="btn btn--principal btn--pequeno" onClick={() => guardarEdicion(rutina)}>
                      Guardar cambios
                    </button>
                    <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setEditando(false)}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>Pasos:</strong>
                  </p>
                  <ol>
                    {rutina.pasos.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ol>
                  <p>
                    <strong>Duración aproximada:</strong> {rutina.duracionMinutos} minutos
                  </p>
                  <p className="texto-pequeno">
                    <strong>Si es un día difícil:</strong> {rutina.alternativaSimple}
                  </p>
                </>
              )}
            </div>

            {!editando && (
              <div className="acciones">
                {rutina.estado !== 'en_prueba' && (
                  <button type="button" className="btn btn--principal" onClick={() => probar(rutina)}>
                    Probar rutina
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--secundario"
                  onClick={() => {
                    setPasosEditados(rutina.pasos.join('\n'))
                    setEditando(true)
                  }}
                >
                  Modificar
                </button>
                <button type="button" className="btn btn--peligro" onClick={() => descartar(rutina)}>
                  Descartar
                </button>
                <button type="button" className="btn btn--suave" onClick={() => alternativa(rutina)} disabled={ocupado}>
                  {ocupado ? 'Preparando…' : 'Pedir una alternativa'}
                </button>
              </div>
            )}

            {!editando && (
              <div className="registro__bloque">
                <p className="texto-pequeno">
                  <strong>¿Cómo fue?</strong> Puedes anotar algo breve (opcional).
                </p>
                <input className="campo" type="text" aria-label="Nota sobre la rutina" placeholder="Por ejemplo: me costó empezar, o me ayudó…" value={nota} onChange={(e) => setNota(e.target.value)} />
                <div className="acciones">
                  <button type="button" className="btn btn--principal btn--pequeno" onClick={() => registrar(rutina, true)}>
                    Ya la hice
                  </button>
                  <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => registrar(rutina, false)}>
                    No me funcionó
                  </button>
                </div>
              </div>
            )}

            {rutina.resultados.length > 0 && (
              <div className="registro__bloque">
                <p className="texto-pequeno">
                  <strong>Lo que has registrado:</strong>
                </p>
                <ul className="texto-pequeno">
                  {rutina.resultados.map((s) => (
                    <li key={s.fecha}>
                      {formatearFecha(s.fecha)}: {s.realizada ? 'la hiciste' : 'no te funcionó'}
                      {s.nota ? ` · ${s.nota}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : registro.errorRutina ? (
          <div className="aviso aviso--error">
            <p>La rutina de este día no se pudo generar. {registro.errorRutina}</p>
            <button type="button" className="btn btn--principal btn--pequeno" onClick={reintentar} disabled={ocupado}>
              {ocupado ? 'Generando…' : 'Reintentar generar la rutina'}
            </button>
          </div>
        ) : (
          <p>Este día todavía no tiene rutina.</p>
        )}
      </section>

      {otras.length > 0 && (
        <section className="tarjeta">
          <h3>Rutinas anteriores</h3>
          <ul className="lista">
            {otras.map((o) => (
              <li key={o.id} className="lista__item">
                <div className="fila-entre">
                  <strong>{o.titulo}</strong>
                  <span className="insignia">{o.estado === 'en_prueba' ? 'En prueba' : o.estado === 'descartada' ? 'Descartada' : 'Propuesta'}</span>
                </div>
                <p className="texto-pequeno">Creada el {formatearFecha(o.creada)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {conAnalisis.length > 0 && !rutina && (
        <p className="texto-pequeno">Hay días analizados sin rutina todavía. Puedes revisarlos en "Historial".</p>
      )}
    </>
  )
}

export default RomperCiclo
