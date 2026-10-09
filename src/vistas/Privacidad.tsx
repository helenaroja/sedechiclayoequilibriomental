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
    if (!window.confirm('¿Eliminar todos tus registros, interpretaciones, patrones, propuestas, notas y conversaciones? No se puede deshacer.')) return
    actualizar((e) => ({
      ...e,
      registros: [],
      patrones: [],
      acciones: [],
      chat: [],
      notas: [],
      analisis: undefined,
      consentimiento: false,
      contextoChat: false,
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
          <li>Tu texto original se guarda tal como lo escribiste, en este navegador y dispositivo.</li>
          <li>No se sincronizan automáticamente con otros dispositivos ni con otras personas.</li>
          <li>No pedimos nombre completo, DNI ni otros datos innecesarios. En demostraciones usa datos ficticios.</li>
        </ul>

        <h3>Cuándo se envían datos a la IA</h3>
        <ul className="texto-pequeno">
          <li>
            <strong>Analizar mi día:</strong> se envían los registros recientes (hasta 30) para interpretarlos y buscar patrones.
          </li>
          <li>
            <strong>Propuestas en "Romper el ciclo":</strong> se envían el patrón elegido y tus últimos registros.
          </li>
          <li>
            <strong>Chat:</strong> se envía tu mensaje. Tus registros solo se envían si activas "Usar mis registros para responder" en el chat.
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
          {estado.registros.length} registro(s) · {estado.patrones.length} patrón(es) · {estado.acciones.length} propuesta(s)
          · {(estado.notas ?? []).length} nota(s) · {estado.chat.length} mensaje(s)
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
