import type { Props } from '../lib/vista'

function Privacidad({ estado, actualizar }: Props) {
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
    if (!window.confirm('¿Eliminar todos tus registros, patrones, acciones y conversaciones? No se puede deshacer.')) return
    actualizar((e) => ({
      ...e,
      registros: [],
      patrones: [],
      acciones: [],
      chat: [],
      notas: [],
      analisis: undefined,
      consentimiento: false,
    }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Mis datos</h2>
        <p>Decides qué se guarda, qué se envía y cuándo borrarlo.</p>
      </header>

      <section className="tarjeta">
        <h3>Cómo se guardan tus datos</h3>
        <ul className="texto-pequeno">
          <li>Tus registros, patrones, acciones y conversaciones se guardan solo en este navegador y dispositivo.</li>
          <li>No se sincronizan automáticamente con otros dispositivos ni con otras personas.</li>
          <li>Solo se envían a un servicio de IA (Anthropic) cuando analizas tus registros o conversas en el chat, y únicamente si das tu consentimiento.</li>
          <li>No pedimos nombre completo, DNI ni otros datos innecesarios. Usa datos ficticios si estás haciendo una demostración.</li>
        </ul>

        <label className="casilla">
          <input
            type="checkbox"
            checked={estado.consentimiento}
            onChange={(e) => actualizar((s) => ({ ...s, consentimiento: e.target.checked }))}
          />
          <span>Acepto el envío de mis relatos a un servicio de IA para su análisis.</span>
        </label>
      </section>

      <section className="tarjeta">
        <h3>Tus datos guardados</h3>
        <p>
          {estado.registros.length} registro(s) · {estado.patrones.length} patrón(es) · {estado.acciones.length} acción(es)
          · {estado.chat.length} mensaje(s)
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
