import type { ReactNode } from 'react'
import { UCV_LINKS } from './config'

const REDES: { id: keyof typeof UCV_LINKS.redes; nombre: string; icono: ReactNode }[] = [
  {
    id: 'instagram',
    nombre: 'Instagram',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    nombre: 'Facebook',
    icono: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M14 8V6.2c0-.9.3-1.4 1.5-1.4H17V2h-2.6C11.6 2 11 3.5 11 5.6V8H8.5v3H11v11h3V11h2.7l.4-3H14z" />
      </svg>
    ),
  },
  {
    id: 'youtube',
    nombre: 'YouTube',
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
    <section className="redes" aria-labelledby="redes-titulo">
      <h2 id="redes-titulo" className="redes__titulo">
        Encuéntranos en nuestras redes sociales
      </h2>
      <ul className="redes__lista">
        {REDES.map((red) => (
          <li key={red.id}>
            <a
              className="red"
              href={UCV_LINKS.redes[red.id]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${red.nombre} de la UCV Perú`}
            >
              {red.icono}
              <span>{red.nombre}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default SocialLinks
