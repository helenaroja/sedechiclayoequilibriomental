import { useState, type FormEvent } from 'react'
import { conversarIA } from '../lib/api'
import { fechaClave, memoriaDelUsuario, nuevoId, registrosDelUsuario, rutinasDelUsuario, type Mensaje, type TipoMemoria } from '../lib/datos'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'

const SUGERENCIAS = [
  '¿Cómo puedo dormir mejor?',
  '¿Cómo puedo concentrarme en clase?',
  '¿Cómo puedo organizar mi semana?',
  '¿Qué puedo hacer si estoy estresado?',
  '¿Cómo puedo dejar de procrastinar?',
  '¿Cómo puedo crear una rutina que pueda mantener?',
]

function Chat({ estado, actualizar, ir }: Props) {
  const [texto, setTexto] = useState('')
  const [relacionCon, setRelacionCon] = useState('')
  const [cargando, setCargando] = useState(false)
  const [ayuda, setAyuda] = useState(false)
  const [guardado, setGuardado] = useState<string[]>([])

  const rutinasEnPrueba = rutinasDelUsuario(estado).filter((r) => r.estado === 'en_prueba')
  const cantidadMemoria = memoriaDelUsuario(estado).length
  const ultimo = estado.chat[estado.chat.length - 1]
  const puedeReintentar = !cargando && ultimo?.error === true

  async function enviarTexto(mensaje: string, reintento: boolean) {
    if (!mensaje || cargando) return

    if (!estado.consentimiento) {
      actualizar((e) => ({
        ...e,
        chat: [
          ...e.chat,
          {
            id: nuevoId(),
            rol: 'asistente',
            texto: 'Para conversar necesitamos tu permiso para enviar mensajes a un servicio de IA. Puedes darlo en "Mis datos".',
            error: true,
          },
        ],
      }))
      return
    }

    const historial = estado.chat.filter((m) => !m.error).slice(-10).map((m) => ({ rol: m.rol, texto: m.texto }))
    const relacion = relacionCon

    if (reintento) {
      actualizar((e) => ({ ...e, chat: e.chat.filter((m) => !m.error) }))
    } else {
      const usuario: Mensaje = { id: nuevoId(), rol: 'usuario', texto: mensaje }
      actualizar((e) => ({
        ...e,
        chat: [...e.chat, usuario],
        rutinas: relacion
          ? e.rutinas.map((r) => (r.id === relacion ? { ...r, comentarios: [...r.comentarios, { fecha: new Date().toISOString(), texto: mensaje }] } : r))
          : e.rutinas,
      }))
    }

    setTexto('')
    setGuardado([])
    if (hayRiesgo(mensaje)) setAyuda(true)
    setCargando(true)

    const contexto = estado.contextoChat
      ? registrosDelUsuario(estado)
          .slice(-10)
          .map((r) => ({ fecha: fechaClave(r.creado), texto: r.texto }))
      : []

    const respuesta = await conversarIA({
      mensaje,
      historial,
      memoria: memoriaDelUsuario(estado).slice(-15),
      contexto,
    })
    setCargando(false)

    if (!respuesta.ok) {
      actualizar((e) => ({
        ...e,
        chat: [...e.chat, { id: nuevoId(), rol: 'asistente', texto: respuesta.mensaje, error: true }],
      }))
      return
    }

    if (respuesta.datos.senalRiesgo) setAyuda(true)
    const nuevas = respuesta.datos.memoriaNueva
    actualizar((e) => ({
      ...e,
      chat: [...e.chat, { id: nuevoId(), rol: 'asistente', texto: respuesta.datos.respuesta }],
      memoria: [
        ...e.memoria,
        ...nuevas.map((m) => ({
          id: nuevoId(),
          usuarioId: e.usuarioId,
          tipo: m.tipo as TipoMemoria,
          texto: m.texto,
          creada: new Date().toISOString(),
          fuente: 'chat' as const,
        })),
      ],
    }))
    setGuardado(nuevas.map((m) => m.texto))
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    void enviarTexto(texto.trim(), false)
  }

  function reintentar() {
    const anterior = [...estado.chat].reverse().find((m) => m.rol === 'usuario')
    if (anterior) void enviarTexto(anterior.texto, true)
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Conversemos</h2>
        <p>
          Puedes preguntarme sobre sueño, estudio, organización, emociones o cómo crear hábitos. Si me cuentas algo sobre ti, lo
          guardo en tu memoria para próximas conversaciones; puedes verlo o borrarlo en "Mis datos".
        </p>
      </header>

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        {estado.chat.length === 0 && (
          <div className="acciones" style={{ marginTop: 0 }}>
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" className="btn btn--suave btn--pequeno" onClick={() => void enviarTexto(s, false)} disabled={cargando}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat" aria-live="polite">
          {estado.chat.length === 0 && <p className="vacio">Escribe tu pregunta o elige una de las sugerencias.</p>}
          {estado.chat.map((m) => (
            <div key={m.id} className={`burbuja burbuja--${m.rol === 'usuario' ? 'usuario' : 'asistente'} ${m.error ? 'burbuja--error' : ''}`}>
              {m.texto}
            </div>
          ))}
          {cargando && <p className="cargando">Pensando…</p>}
        </div>

        {puedeReintentar && (
          <div className="acciones">
            <button type="button" className="btn btn--principal btn--pequeno" onClick={reintentar}>
              Reintentar mi última pregunta
            </button>
          </div>
        )}

        {guardado.length > 0 && (
          <p className="aviso aviso--ok" role="status">
            Guardé esto en tu memoria: {guardado.map((g) => `"${g}"`).join(' · ')}. Puedes corregirlo o borrarlo en "Mis datos".
          </p>
        )}

        {!estado.consentimiento && <p className="aviso">Para conversar necesitamos tu permiso para enviar mensajes a un servicio de IA.</p>}

        <label className="texto-pequeno" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
          <input type="checkbox" checked={estado.contextoChat} onChange={(e) => actualizar((s) => ({ ...s, contextoChat: e.target.checked }))} />
          Usar mis registros diarios como contexto (si son relevantes). Está apagado por defecto.
        </label>

        {rutinasEnPrueba.length > 0 && (
          <label className="texto-pequeno" style={{ display: 'block', marginBottom: '0.6rem' }}>
            Este mensaje es sobre una rutina que estoy probando (opcional):
            <select className="campo" value={relacionCon} onChange={(e) => setRelacionCon(e.target.value)}>
              <option value="">No está relacionado</option>
              {rutinasEnPrueba.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.titulo}
                </option>
              ))}
            </select>
          </label>
        )}

        <form className="fila-chat" onSubmit={enviar}>
          <input
            className="campo"
            type="text"
            aria-label="Escribe un mensaje"
            placeholder="Escribe tu pregunta…"
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="btn btn--principal" disabled={cargando || !texto.trim()}>
            Enviar
          </button>
        </form>

        <div className="acciones">
          <button type="button" className="btn btn--suave btn--pequeno" onClick={() => ir('privacidad')}>
            Ver lo que recuerdo ({cantidadMemoria})
          </button>
          {estado.chat.length > 0 && (
            <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => actualizar((e) => ({ ...e, chat: [] }))}>
              Borrar conversación
            </button>
          )}
        </div>
      </section>
    </>
  )
}

export default Chat
