import { useState } from 'react'
import { fechaClave, formatearDiaCorto, formatearFecha, nuevoId, registrosDelUsuario, rutinasDelUsuario } from '../lib/datos'
import { diasAtras, diasConRegistro } from '../lib/racha'
import type { Props } from '../lib/vista'
import { BannerRacha, Calendario } from './Racha'

const MINIMO_DIAS_PARA_COMPARAR = 3
const MINIMO_DIAS_PARA_MES = 7

function Seguimiento({ estado, actualizar, ir }: Props) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [año, setAño] = useState(hoy.getFullYear())
  const [nota, setNota] = useState('')

  const registros = registrosDelUsuario(estado)
  const rutinas = [...rutinasDelUsuario(estado)].sort((a, b) => b.creada.localeCompare(a.creada))
  const notas = estado.notas ?? []

  const logros = registros
    .flatMap((r) => (r.analisis?.positivos ?? []).map((p) => ({ fecha: fechaClave(r.creado), texto: p.texto, cita: p.cita, creado: r.creado })))
    .sort((a, b) => b.creado.localeCompare(a.creado))

  const dias = [...diasConRegistro(registros)]
  const semanaActual = dias.filter((d) => d > diasAtras(7)).length
  const semanaAnterior = dias.filter((d) => d > diasAtras(14) && d <= diasAtras(7)).length
  const diasUltimoMes = dias.filter((d) => d > diasAtras(30)).length
  const logrosUltimoMes = logros.filter((l) => l.fecha > diasAtras(30)).length

  const rutinasRealizadas = rutinas.flatMap((r) => r.resultados.filter((s) => s.realizada).map((s) => ({ titulo: r.titulo, fecha: s.fecha })))
  const rutinasNoFuncionaron = rutinas.flatMap((r) => r.resultados.filter((s) => !s.realizada).map((s) => ({ titulo: r.titulo, fecha: s.fecha, nota: s.nota, id: r.id })))

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
        <p>Aquí reconocemos lo que describes en tus días y lo que registras sobre tus rutinas. Son observaciones, no evaluaciones de ti.</p>
      </header>

      <BannerRacha registros={registros} />

      <section className="tarjeta">
        <h3>Calendario de registros</h3>
        <Calendario
          registros={registros}
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
          <p className="texto-pequeno">Todavía no hay logros en tus registros analizados. Cuando describas algo que salió bien y lo analicemos, aparecerá aquí.</p>
        ) : (
          <ul className="lista">
            {logros.slice(0, 3).map((l) => (
              <li key={`${l.creado}-${l.texto}`} className="lista__item">
                <p>
                  El {formatearDiaCorto(l.fecha)} describiste: "{l.texto}". Ese avance merece reconocerse; sigamos observando qué lo hizo posible.
                </p>
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

      <section className="tarjeta">
        <h3>Tus rutinas</h3>
        {rutinas.length === 0 ? (
          <p className="texto-pequeno">Cuando tengas una rutina en "Romper el ciclo", aquí verás cómo te fue.</p>
        ) : (
          <>
            <p>
              <span className="estadistica">{rutinasRealizadas.length}</span> vez(ces) que registraste haber hecho una rutina ·{' '}
              <span className="estadistica">{rutinas.filter((r) => r.estado === 'en_prueba').length}</span> en prueba
            </p>
            {rutinasRealizadas.length > 0 && (
              <p className="texto-pequeno">
                Realizaste: {[...new Set(rutinasRealizadas.map((r) => r.titulo))].join(', ')}.
              </p>
            )}
            <ul className="lista" style={{ marginTop: '0.75rem' }}>
              {rutinas.map((r) => {
                const ultimo = r.resultados[r.resultados.length - 1]
                return (
                  <li key={r.id} className="lista__item">
                    <div className="fila-entre">
                      <strong>{r.titulo}</strong>
                      <span className="insignia">
                        {r.estado === 'en_prueba' ? 'En prueba' : r.estado === 'descartada' ? 'Descartada' : 'Propuesta'}
                      </span>
                    </div>
                    {ultimo ? (
                      <p className="texto-pequeno">
                        Último registro ({formatearFecha(ultimo.fecha)}): {ultimo.realizada ? 'la hiciste' : 'no te funcionó'}
                        {ultimo.nota ? ` · ${ultimo.nota}` : ''}
                      </p>
                    ) : (
                      <p className="texto-pequeno">Aún no has registrado cómo te fue.</p>
                    )}
                    {ultimo && !ultimo.realizada && (
                      <div className="acciones">
                        <p className="texto-pequeno">Que una rutina no funcione también es información. Podemos ajustarla.</p>
                        <button type="button" className="btn btn--suave btn--pequeno" onClick={() => ir('ciclo', registros.find((x) => x.rutinaId === r.id)?.id)}>
                          Ajustar la rutina
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {rutinasNoFuncionaron.length > 0 && (
              <p className="texto-pequeno">Para ajustarlas puedes revisar las notas que escribiste en cada una.</p>
            )}
          </>
        )}
      </section>

      <section className="grid-dos">
        <div className="tarjeta">
          <h3>Progreso semanal</h3>
          {semanaActual >= MINIMO_DIAS_PARA_COMPARAR && semanaAnterior >= MINIMO_DIAS_PARA_COMPARAR ? (
            <p>
              <span className="estadistica">{semanaActual}</span> días registrados esta semana · <span className="estadistica">{semanaAnterior}</span>{' '}
              la semana anterior
            </p>
          ) : (
            <p className="texto-pequeno">
              Para comparar semanas necesitamos al menos {MINIMO_DIAS_PARA_COMPARAR} días registrados en cada una. Esta semana tienes{' '}
              {semanaActual}.
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
            <p className="texto-pequeno">Verás un resumen mensual cuando tengas al menos {MINIMO_DIAS_PARA_MES} días registrados en el último mes.</p>
          )}
        </div>
      </section>

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

      <p className="texto-pequeno">Estas comparaciones describen lo que escribiste. No demuestran una relación de causa y efecto ni miden tu salud.</p>
    </>
  )
}

export default Seguimiento
