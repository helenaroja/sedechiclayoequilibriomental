import { useState } from 'react'
import { diasAtras, fechaClave, formatearDiaCorto, formatearFecha, nuevoId } from '../lib/datos'
import { diasConRegistro } from '../lib/racha'
import type { Props } from '../lib/vista'
import { BannerRacha, Calendario } from './Racha'

const MINIMO_DIAS_PARA_COMPARAR = 3
const MINIMO_DIAS_PARA_MES = 7

const MENSAJES_LOGRO = [
  (fecha: string, texto: string) => `El ${fecha} mencionaste: "${texto}". ¡Muy bien! Sigue observando qué te ayuda a conseguirlo.`,
  (fecha: string, texto: string) => `Registraste el ${fecha}: "${texto}". Ese avance vale la pena reconocerlo.`,
  (fecha: string, texto: string) => `El ${fecha} escribiste: "${texto}". Podemos revisar qué hiciste ese día para repetirlo.`,
]

function Seguimiento({ estado, actualizar, ir }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [año, setAño] = useState(hoy.getFullYear())
  const [nota, setNota] = useState('')

  const notas = estado.notas ?? []
  const dias = [...diasConRegistro(estado.registros)]

  const logros = estado.registros
    .flatMap((r) => (r.analisis?.positivos ?? []).map((p) => ({ fecha: fechaClave(r.creado), texto: p.texto, cita: p.cita, creado: r.creado })))
    .sort((a, b) => b.creado.localeCompare(a.creado))

  const semanaActual = dias.filter((d) => d > diasAtras(7)).length
  const semanaAnterior = dias.filter((d) => d > diasAtras(14) && d <= diasAtras(7)).length
  const diasUltimoMes = dias.filter((d) => d > diasAtras(30)).length
  const logrosUltimoMes = logros.filter((l) => l.fecha > diasAtras(30)).length

  function agregarNota() {
    const texto = nota.trim()
    if (!texto) return
    actualizar((e) => ({ ...e, notas: [...(e.notas ?? []), { id: nuevoId(), creado: new Date().toISOString(), texto }] }))
    setNota('')
  }

  function borrarNota(id: string) {
    actualizar((e) => ({ ...e, notas: (e.notas ?? []).filter((n) => n.id !== id) }))
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>Tu seguimiento</h2>
        <p>Aquí reconocemos lo que describes en tus días y cómo se van viendo tus pruebas. Son observaciones, no evaluaciones de ti.</p>
      </header>

      <BannerRacha registros={estado.registros} />

      <section className="tarjeta">
        <h3>Calendario de registros</h3>
        <Calendario
          registros={estado.registros}
          mes={mes}
          año={año}
          onCambiar={(m, a) => {
            setMes(m)
            setAño(a)
          }}
        />
      </section>

      <section className="tarjeta">
        <h3>Lo que has logrado</h3>
        {logros.length === 0 ? (
          <p className="texto-pequeno">
            Todavía no hay logros descritos en tus registros. Cuando los menciones y los analicemos, aparecerán aquí.
          </p>
        ) : (
          <ul className="lista">
            {logros.slice(0, 3).map((l, i) => (
              <li key={`${l.creado}-${l.texto}`} className="lista__item">
                <p>{MENSAJES_LOGRO[i % MENSAJES_LOGRO.length](formatearDiaCorto(l.fecha), l.texto)}</p>
              </li>
            ))}
          </ul>
        )}
        {logros.length > 3 && (
          <details style={{ marginTop: '0.75rem' }}>
            <summary className="texto-pequeno">Ver todos mis logros ({logros.length})</summary>
            <ul className="texto-pequeno">
              {logros.map((l) => (
                <li key={`${l.creado}-${l.texto}`}>
                  {formatearDiaCorto(l.fecha)}: {l.texto} <span>(en tu relato: "{l.cita}")</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="grid-dos">
        <div className="tarjeta">
          <h3>Progreso semanal</h3>
          {semanaActual >= MINIMO_DIAS_PARA_COMPARAR && semanaAnterior >= MINIMO_DIAS_PARA_COMPARAR ? (
            <p>
              <span className="estadistica">{semanaActual}</span> días registrados esta semana ·{' '}
              <span className="estadistica">{semanaAnterior}</span> la semana anterior
            </p>
          ) : (
            <p className="texto-pequeno">
              Para comparar semanas necesitamos al menos {MINIMO_DIAS_PARA_COMPARAR} días registrados en cada una. Esta semana
              tienes {semanaActual}.
            </p>
          )}
        </div>

        <div className="tarjeta">
          <h3>Último mes</h3>
          {diasUltimoMes >= MINIMO_DIAS_PARA_MES ? (
            <p>
              Registraste <span className="estadistica">{diasUltimoMes}</span> días y describiste{' '}
              <span className="estadistica">{logrosUltimoMes}</span> aspectos positivos.
            </p>
          ) : (
            <p className="texto-pequeno">Se mostrará un resumen mensual cuando tengas al menos {MINIMO_DIAS_PARA_MES} días registrados en el último mes.</p>
          )}
        </div>
      </section>

      {estado.acciones.length > 0 && (
        <section className="tarjeta">
          <h3>Propuestas que probaste</h3>
          <ul className="lista">
            {estado.acciones.map((a) => {
              const ultimo = a.seguimientos[a.seguimientos.length - 1]
              const comentarios = a.comentarios ?? []
              const noFuncionó = ultimo && !ultimo.realizada
              return (
                <li key={a.id} className="lista__item">
                  <div className="fila-entre">
                    <strong>{a.alternativa.titulo}</strong>
                    <span className="insignia">{a.estado === 'probando' ? 'En prueba' : a.estado === 'completada' ? 'Completada' : 'Pendiente'}</span>
                  </div>
                  <p className="texto-pequeno">Patrón: {a.patronNombre}</p>
                  {ultimo ? (
                    <p className="texto-pequeno">
                      Último registro ({formatearFecha(ultimo.fecha)}): {ultimo.realizada ? 'la intentaste' : 'no la pudiste hacer'}
                      {ultimo.sensacion ? ` · ${ultimo.sensacion}` : ''}
                    </p>
                  ) : (
                    <p className="texto-pequeno">Aún no has registrado cómo te fue.</p>
                  )}
                  {noFuncionó && (
                    <div className="acciones">
                      <p className="texto-pequeno">Que una propuesta no funcione también es información. Podemos ajustarla juntos.</p>
                      <button type="button" className="btn btn--suave btn--pequeno" onClick={() => ir('ciclo', a.patronId)}>
                        Ajustar la propuesta
                      </button>
                    </div>
                  )}
                  {comentarios.length > 0 && (
                    <div className="registro__bloque">
                      <p className="texto-pequeno">
                        <strong>Comentarios desde el chat:</strong>
                      </p>
                      <ul className="texto-pequeno">
                        {comentarios.map((c) => (
                          <li key={c.fecha}>
                            {formatearFecha(c.fecha)}: "{c.texto}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="tarjeta">
        <h3>Cambios que he notado</h3>
        <p className="texto-pequeno">Anota con tus palabras lo que percibes, por ejemplo: "esta semana me costó menos empezar".</p>
        <div className="fila-chat">
          <input className="campo" type="text" aria-label="Cambio que he notado" placeholder="Escribe lo que notas…" maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="button" className="btn btn--principal" onClick={agregarNota} disabled={!nota.trim()}>
            Agregar
          </button>
        </div>
        {notas.length > 0 && (
          <ul className="lista" style={{ marginTop: '1rem' }}>
            {[...notas]
              .sort((a, b) => b.creado.localeCompare(a.creado))
              .map((n) => (
                <li key={n.id} className="lista__item">
                  <div className="fila-entre">
                    <span className="texto-pequeno">{formatearFecha(n.creado)}</span>
                    <button type="button" className="btn btn--peligro btn--pequeno" onClick={() => borrarNota(n.id)}>
                      Eliminar
                    </button>
                  </div>
                  <p>{n.texto}</p>
                </li>
              ))}
          </ul>
        )}
      </section>

      <p className="texto-pequeno">
        Estas comparaciones describen lo que escribiste. No demuestran una relación de causa y efecto ni miden tu salud.
      </p>
    </>
  )
}

export default Seguimiento
