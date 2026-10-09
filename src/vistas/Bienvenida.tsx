import SocialLinks from '../SocialLinks'
import { UCV_LINKS } from '../config'

type Props = { onEntrar: () => void }

function Bienvenida({ onEntrar }: Props) {
  return (
    <main className="bienvenida">
      <div className="tarjeta-bienvenida">
        <span className="etiqueta">Bienvenido/a, estudiante de la UCV Perú</span>
        <h1 className="bienvenida__titulo">
          <strong>CUÉNTAME TU DÍA</strong>
        </h1>
        <p className="bienvenida__texto">
          Un espacio seguro para ti. Escribe cómo te sentiste hoy, comparte tu rutina, lo que te pasó y aquello que te
          preocupó. La IA te ayudará a reconocer patrones en tus días, comprender qué situaciones se repiten y encontrar
          pequeños cambios que favorezcan tu bienestar.
        </p>

        <SocialLinks />

        <div className="bienvenida__acciones">
          <button type="button" className="btn btn--principal" onClick={onEntrar}>
            Entrar a Cuéntame tu día
          </button>
          <a
            className="btn btn--secundario"
            href={UCV_LINKS.paginaPrincipal}
            target="_blank"
            rel="noopener noreferrer"
          >
            Página principal UCV Perú
          </a>
        </div>
      </div>
    </main>
  )
}

export default Bienvenida
