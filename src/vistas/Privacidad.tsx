import { useState } from 'react'
import { formatearFecha, memoriaDelUsuario, registrosDelUsuario, rutinasDelUsuario, type Memoria } from '../lib/datos'
import type { Props } from '../lib/vista'

const ETIQUETAS_TIPO: Record<Memoria['tipo'], string> = {
  objetivo: 'Objetivo',
  preferencia: 'Preferencia',
  rutina_aceptada: 'Rutina aceptada',
  rutina_rechazada: 'Rutina descartada',
  funciona: 'Le funcionó',
  no_funciona: 'No le funcionó',
  correccion: 'Corrección',
}

function Privacidad({ estado, actualizar }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const memoria = memoriaDelUsuario(estado)
  const registros = registrosDelUsuario(estado)
  const rutinas = rutinasDelUsuario(estado)

  function exportar() {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'cuentame-tu-dia.json'
    enlace.click()
    URL.revokeObjectURL(url)
  }

  function eliminarTodo() {
    if (!window.confirm('¿Eliminar todos tus registros, análisis, rutinas, memoria, patrones, notas y conversaciones? No se puede deshacer.')) return
    actualizar((e) => ({
      ...e,
      registros: e.registros.filter((r) => r.usuarioId !== e.usuarioId),
      rutinas: e.rutinas.filter((r) => r.usuarioId !== e.usuarioId),
      memoria: e.memoria.filter((m) => m.usuarioId !== e.usuarioId),
      patrones: [],
      patronesError: undefined,
      patronesCreado: undefined,
      chat: [],
      notas: [],
      consentimiento: false,
      contextoChat: false,
    }))
  }

  function guardarEdicion(id: string) {
    const nuevo = texto.trim()
    if (!nuevo) return
    actualizar((e) => ({ ...e, memoria: e.memoria.map((m) => (m.id === id ? { ...m, texto: nuevo } : m)) }))
    setEditando(null)
  }

  function borrarMemoria(id: string) {
    actualizar((e) => ({ ...e, memoria: e.memoria.filter((m) => m.id !== id) }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Mis datos</h2>
        <p>Decides qué se guarda, qué se envía y cuándo borrarlo.</p>
      </header>

      <section className="tarjeta">
        <h3>Lo que recuerdo de ti</h3>
        <p className="texto-pequeno">
          Estas son cosas que me contaste y que uso para personalizar mis próximas respuestas y propuestas. Puedes corregirlas o
          borrarlas. Solo uso lo que aparece aquí; no recuerdo nada más.
        </p>
        {memoria.length === 0 ? (
          <p className="texto-pequeno">Todavía no hay nada guardado en tu memoria.</p>
        ) : (
          <ul className="lista">
            {memoria.map((m) => (
              <li key={m.id} className="lista__item">
                <div className="fila-entre">
                  <span className="insignia">{ETIQUETAS_TIPO[m.tipo]}</span>
                  <span className="texto-pequeno">{formatearFecha(m.creada)}</span>
                </div>
                {editando === m.id ? (
                  <>
                    <textarea className="campo-texto" style={{ minHeight: '70px' }} aria-label="Editar recuerdo" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    <div className="acciones">
                      <button type="button" className="btn btn--principal btn--pequeno" onClick={() => guardarEdicion(m.id)}>
                        Guardar
                      </button>
                      <button type="button" className="btn btn--suave btn--pequeno" onClick={() => setEditando(null)}>
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p>{m.texto}</p>
                    <div className="acciones">
                      <button
                        type="button"
                        className="btn btn--suave btn--pequeno"
                        onClick={() => {
                          setTexto(m.texto)
                          setEditando(m.id)
                        }}
                      >
                        Corregir
                      </button>
                      <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => borrarMemoria(m.id)}>
                        Borrar
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <h3>Cómo se guardan tus datos</h3>
        <ul className="texto-pequeno">
          <li>Tu texto original se guarda tal como lo escribiste, en este navegador. No se sincroniza con otros dispositivos.</li>
          <li>Cada dato está asociado a tu identificador de usuario en este navegador: {estado.usuarioId.slice(0, 8)}…</li>
          <li>No pedimos nombre completo, DNI ni otros datos innecesarios. Usa datos ficticios en demostraciones.</li>
        </ul>

        <h3>Cuándo se envían datos a la IA</h3>
        <ul className="texto-pequeno">
          <li>
            <strong>Analizar mi día:</strong> se envía el texto de ese día y lo que recuerdo de ti.
          </li>
          <li>
            <strong>Patrones:</strong> se envían tus registros recientes (hasta 30) y lo que recuerdo de ti.
          </li>
          <li>
            <strong>Rutinas:</strong> se envían el análisis de ese día, algunos días anteriores y lo que recuerdo de ti.
          </li>
          <li>
            <strong>Chat:</strong> se envía tu mensaje y lo que recuerdo de ti. Tus registros diarios solo se envían si activas la
            opción en el chat.
          </li>
        </ul>

        <label className="casilla">
          <input type="checkbox" checked={estado.consentimiento} onChange={(e) => actualizar((s) => ({ ...s, consentimiento: e.target.checked }))} />
          <span>Acepto el envío de mis textos a un servicio de IA para las funciones anteriores.</span>
        </label>
      </section>

      <section className="tarjeta">
        <h3>Tus datos guardados</h3>
        <p>
          {registros.length} registro(s) · {rutinas.length} rutina(s) · {memoria.length} recuerdo(s) · {estado.chat.length} mensaje(s)
        </p>
        <div className="acciones">
          <button type="button" className="btn btn--suave" onClick={exportar}>
            Descargar mis datos (JSON)
          </button>
          <button type="button" className="btn btn--peligro" onClick={eliminarTodo}>
            Eliminar todos mis datos
          </button>
        </div>
      </section>
    </>
  )
}

export default Privacidad
