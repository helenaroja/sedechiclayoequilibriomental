import { UCV_LINKS } from './config'
import SocialLinks from './SocialLinks'

const DESCRIPCION =
  'Un espacio seguro para ti. Escribe cómo te sentiste hoy, comparte tu rutina, lo que te pasó y aquello que te preocupó. La IA guardará tu registro para ayudarte a comparar tu bienestar con los días anteriores.'

function App() {
  return (
    <main className="welcome">
      <div className="welcome__card">
        <p className="welcome__eyebrow">Bienvenido/a, estudiante de la UCV Perú</p>

        <h1 className="welcome__title">
          <strong>CUÉNTAME TU DÍA</strong>
        </h1>

        <p className="welcome__description">{DESCRIPCION}</p>

        <SocialLinks />

        <nav className="welcome__links" aria-label="Página principal de la UCV Perú">
          <a
            className="welcome__button welcome__button--secondary"
            href={UCV_LINKS.paginaPrincipal}
            target="_blank"
            rel="noopener noreferrer"
          >
            Página principal UCV Perú
          </a>
        </nav>
      </div>
    </main>
  )
}

export default App
