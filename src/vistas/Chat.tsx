import { useState, type FormEvent } from 'react'
import { conversarConIA } from '../lib/api'
import { nuevoId } from '../lib/datos'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'

const SUGERENCIAS = [
  '¿Cómo puedo dormir mejor?',
  '¿Cómo puedo concentrarme en clase?',
  '¿Cómo puedo organizar mi día?',
  '¿Qué puedo hacer si estoy estresado?',
  '¿Cómo puedo dejar de procrastinar?',
  '¿Cómo puedo crear una rutina que pueda mantener?',
]

function Chat({ estado, actualizar }: Props) {
  const [texto, setTexto] = useState('')
  const [relacionCon, setRelacionCon] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ayuda, setAyuda] = useState(false)

  const enPrueba = estado.acciones.filter((a) => a.estado === 'probando')

  async function enviar(evento?: FormEvent, preguntaDirecta?: string) {
    evento?.preventDefault()
    const mensaje = (preguntaDirecta ?? texto).trim()
    if (!mensaje || cargando) return
    if (!estado.consentimiento) {
      setError('Para conversar necesitamos tu permiso para enviar mensajes a un servicio de IA. Actívalo en "Mis datos".')
      return
    }

    const usuario = { id: nuevoId(), rol: 'usuario' as const, texto: mensaje }
    const historial = estado.chat.map((m) => ({ rol: m.rol, texto: m.texto }))
    const accionId = relacionCon
    actualizar((e) => ({
      ...e,
      chat: [...e.chat, usuario],
      acciones: accionId
        ? e.acciones.map((a) =>
            a.id === accionId
              ? { ...a, comentarios: [...(a.comentarios ?? []), { fecha: new Date().toISOString(), texto: mensaje }] }
              : a,
          )
        : e.acciones,
    }))
    setTexto('')
    setError(null)
    if (hayRiesgo(mensaje)) setAyuda(true)
    setCargando(true)

    const respuesta = await conversarConIA(mensaje, historial, estado.contextoChat ? estado.registros : [])
    setCargando(false)

    if (respuesta.modo === 'error') {
      setError(respuesta.mensaje)
      return
    }

    let contenido: string
    if (respuesta.modo === 'ia') {
      contenido = respuesta.datos.respuesta
      if (respuesta.datos.senalRiesgo) setAyuda(true)
    } else {
      contenido =
        'El asistente con IA no está disponible en este momento, así que no puedo responder tu pregunta. Puedes intentarlo de nuevo más tarde; tus registros siguen guardados.'
    }

    actualizar((e) => ({ ...e, chat: [...e.chat, { id: nuevoId(), rol: 'asistente', texto: contenido }] }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Conversemos</h2>
        <p>
          Puedes preguntarme sobre sueño, estudio, organización, emociones o cómo crear hábitos. Te respondo con pasos
          prácticos y, si falta información, te pregunto.
        </p>
      </header>

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        {estado.chat.length === 0 && (
          <div className="acciones" style={{ marginTop: 0 }}>
            {SUGERENCIAS.map((s) => (
              <button key={s} type="button" className="btn btn--suave btn--pequeno" onClick={() => enviar(undefined, s)} disabled={cargando}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="chat" aria-live="polite">
          {estado.chat.length === 0 && <p className="vacio">Escribe tu pregunta o elige una de las sugerencias.</p>}
          {estado.chat.map((m) => (
            <div key={m.id} className={`burbuja burbuja--${m.rol === 'usuario' ? 'usuario' : 'asistente'}`}>
              {m.texto}
            </div>
          ))}
          {cargando && <p className="cargando">Pensando…</p>}
        </div>

        {error && (
          <p className="aviso aviso--error" role="alert">
            {error}
          </p>
        )}

        {!estado.consentimiento && (
          <p className="aviso">Para conversar necesitamos tu permiso para enviar mensajes a un servicio de IA.</p>
        )}

        <label className="texto-pequeno" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
          <input
            type="checkbox"
            checked={estado.contextoChat}
            onChange={(e) => actualizar((s) => ({ ...s, contextoChat: e.target.checked }))}
          />
          Usar mis registros para responder (si son relevantes). Está apagado por defecto.
        </label>

        {enPrueba.length > 0 && (
          <label className="texto-pequeno" style={{ display: 'block', marginBottom: '0.6rem' }}>
            Este mensaje es sobre una propuesta que estoy probando (opcional):
            <select className="campo" value={relacionCon} onChange={(e) => setRelacionCon(e.target.value)}>
              <option value="">No está relacionado</option>
              {enPrueba.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.alternativa.titulo}
                </option>
              ))}
            </select>
          </label>
        )}

        <form className="fila-chat" onSubmit={(e) => enviar(e)}>
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

        {estado.chat.length > 0 && (
          <div className="acciones">
            <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => actualizar((e) => ({ ...e, chat: [] }))}>
              Borrar conversación
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default Chat
