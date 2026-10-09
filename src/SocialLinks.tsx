import { UCV_LINKS } from './config'

const REDES = [
  {
    nombre: 'Instagram',
    url: UCV_LINKS.redesSociales.instagram,
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    nombre: 'Facebook',
    url: UCV_LINKS.redesSociales.facebook,
    icono: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 8V6.2c0-.9.3-1.4 1.5-1.4H17V2h-2.6C11.6 2 11 3.5 11 5.6V8H8.5v3H11v11h3V11h2.7l.4-3H14z" />
      </svg>
    ),
  },
  {
    nombre: 'X (Twitter)',
    url: UCV_LINKS.redesSociales.x,
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M4 4l16 16M20 4L4 20" />
      </svg>
    ),
  },
  {
    nombre: 'YouTube',
    url: UCV_LINKS.redesSociales.youtube,
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="4" />
        <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
      </svg>
    ),
  },
]

function SocialLinks() {
  return (
    <section className="welcome__social" aria-labelledby="redes-titulo">
      <p id="redes-titulo" className="welcome__social-label">
        Redes sociales UCV Perú
      </p>
      <ul className="social-icons">
        {REDES.map((red) => (
          <li key={red.nombre}>
            <a
              className="social-icons__link"
              href={red.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={red.nombre}
              title={red.nombre}
            >
              {red.icono}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default SocialLinks
