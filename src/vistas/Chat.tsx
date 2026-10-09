import { useState, type FormEvent } from 'react'
import { conversarConIA } from '../lib/api'
import { nuevoId } from '../lib/datos'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'

function Chat({ estado, actualizar }: Props) {
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ayuda, setAyuda] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const mensaje = texto.trim()
    if (!mensaje || cargando) return
    if (!estado.consentimiento) {
      setError('Para conversar necesitamos tu permiso. Actívalo en "Cuéntame tu día" o en "Mis datos".')
      return
    }

    const usuario = { id: nuevoId(), rol: 'usuario' as const, texto: mensaje }
    const historial = estado.chat.map((m) => ({ rol: m.rol, texto: m.texto }))
    actualizar((e) => ({ ...e, chat: [...e.chat, usuario] }))
    setTexto('')
    setError(null)
    if (hayRiesgo(mensaje)) setAyuda(true)
    setCargando(true)

    const respuesta = await conversarConIA(mensaje, estado.registros, historial)
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
        'Estás en modo demostración: la conversación con IA no está disponible en este momento. Puedes seguir usando Cuéntame tu día y tu historial.'
    }

    actualizar((e) => ({ ...e, chat: [...e.chat, { id: nuevoId(), rol: 'asistente', texto: contenido }] }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Conversemos</h2>
        <p>
          Puedo ayudarte a pensar en tus días usando solo lo que has guardado. No recuerdo nada fuera de lo que aparece
          aquí.
        </p>
      </header>

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        <div className="chat" aria-live="polite">
          {estado.chat.length === 0 && (
            <p className="vacio">Cuéntame cómo va tu semana o qué te gustaría entender mejor.</p>
          )}
          {estado.chat.map((m) => (
            <div key={m.id} className={`burbuja burbuja--${m.rol === 'usuario' ? 'usuario' : 'asistente'}`}>
              {m.texto}
            </div>
          ))}
          {cargando && <p className="cargando">Pensando…</p>}
        </div>

        {error && <p className="aviso aviso--error" role="alert">{error}</p>}

        {!estado.consentimiento && (
          <p className="aviso">Para conversar necesitamos tu permiso para enviar mensajes a un servicio de IA.</p>
        )}

        <form className="fila-chat" onSubmit={enviar}>
          <input
            className="campo"
            type="text"
            aria-label="Escribe un mensaje"
            placeholder="Escribe un mensaje…"
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
            <button
              type="button"
              className="btn btn--peligro btn--pequeno"
              onClick={() => actualizar((e) => ({ ...e, chat: [] }))}
            >
              Borrar conversación
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default Chat
