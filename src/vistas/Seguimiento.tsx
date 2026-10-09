import { useState } from 'react'
import { diasAtras, fechaClave, formatearFecha, nuevoId } from '../lib/datos'
import type { Props } from '../lib/vista'

function Seguimiento({ estado, actualizar, ir }: Props) {
  const [nota, setNota] = useState('')
  const haceSiete = diasAtras(7)
  const haceCatorce = diasAtras(14)
  const notas = estado.notas ?? []

  function periodo(fecha: string) {
    if (fecha > haceSiete) return 'actual'
    if (fecha > haceCatorce) return 'anterior'
    return null
  }

  function agregarNota() {
    const texto = nota.trim()
    if (!texto) return
    actualizar((e) => ({
      ...e,
      notas: [...(e.notas ?? []), { id: nuevoId(), creado: new Date().toISOString(), texto }],
    }))
    setNota('')
  }

  function borrarNota(id: string) {
    actualizar((e) => ({ ...e, notas: (e.notas ?? []).filter((n) => n.id !== id) }))
  }

  const registrosPorPeriodo = { actual: 0, anterior: 0 }
  for (const r of estado.registros) {
    const p = periodo(fechaClave(r.creado))
    if (p) registrosPorPeriodo[p]++
  }

  const sinDatos = estado.registros.length === 0 && estado.patrones.length === 0 && estado.acciones.length === 0

  return (
    <>
      <header className="encabezado-vista">
        <h2>Tu seguimiento</h2>
        <p>Aquí puedes observar cómo han cambiado tus relatos y tus pruebas. Son observaciones, no evaluaciones de ti.</p>
      </header>

      {sinDatos && (
        <section className="tarjeta vacio">
          <p>Cuando tengas registros, patrones y acciones, verás aquí tu progreso.</p>
          <button type="button" className="btn btn--principal" onClick={() => ir('escribir')}>
            Escribir mi día
          </button>
        </section>
      )}

      <section className="grid-dos">
        <div className="tarjeta">
          <h3>Tus registros</h3>
          <p className="texto-pequeno">Últimos 7 días frente a los 7 días anteriores.</p>
          <p>
            <span className="estadistica">{registrosPorPeriodo.actual}</span> en la última semana ·{' '}
            <span className="estadistica">{registrosPorPeriodo.anterior}</span> en la semana anterior
          </p>
        </div>

        <div className="tarjeta">
          <h3>Acciones</h3>
          <p>
            <span className="estadistica">{estado.acciones.filter((a) => a.estado === 'completada').length}</span>{' '}
            completadas · <span className="estadistica">{estado.acciones.filter((a) => a.estado === 'probando').length}</span>{' '}
            en prueba
          </p>
          <p className="texto-pequeno">
            {estado.acciones.reduce((n, a) => n + a.seguimientos.filter((s) => s.realizada).length, 0)} vez(ces) que
            registraste haberla hecho.
          </p>
        </div>
      </section>

      <section className="tarjeta">
        <h3>Cambios que he notado</h3>
        <p className="texto-pequeno">
          Anota con tus palabras lo que percibes en tus días, por ejemplo: "esta semana me costó menos empezar".
        </p>
        <div className="fila-chat">
          <input
            className="campo"
            type="text"
            aria-label="Cambio que he notado"
            placeholder="Escribe lo que notas…"
            maxLength={500}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
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

      {estado.patrones.length > 0 && (
        <section className="tarjeta">
          <h3>Patrones y su comparación</h3>
          <ul className="lista">
            {estado.patrones.map((p) => {
              const actual = p.evidencia.filter((e) => periodo(e.fecha) === 'actual').length
              const anterior = p.evidencia.filter((e) => periodo(e.fecha) === 'anterior').length
              return (
                <li key={p.id} className="lista__item">
                  <div className="fila-entre">
                    <strong>{p.nombre}</strong>
                    <span className="insignia">
                      {p.interpretacion ? `Interpretación: ${p.interpretacion}` : 'Sin revisar'}
                    </span>
                  </div>
                  <p className="texto-pequeno">
                    Días con este tema: {actual} en la última semana, {anterior} en la anterior.
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {estado.acciones.length > 0 && (
        <section className="tarjeta">
          <h3>Acciones que probaste</h3>
          <ul className="lista">
            {estado.acciones.map((a) => {
              const ultimo = a.seguimientos[a.seguimientos.length - 1]
              const comentarios = a.comentarios ?? []
              return (
                <li key={a.id} className="lista__item">
                  <div className="fila-entre">
                    <strong>{a.alternativa.titulo}</strong>
                    <span className="insignia">
                      {a.estado === 'probando' ? 'En prueba' : a.estado === 'completada' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="texto-pequeno">Patrón: {a.patronNombre}</p>
                  {ultimo ? (
                    <p className="texto-pequeno">
                      Último registro ({formatearFecha(ultimo.fecha)}):{' '}
                      {ultimo.realizada ? 'la hiciste' : 'no la hiciste'}
                      {ultimo.sensacion ? ` · ${ultimo.sensacion}` : ''}
                    </p>
                  ) : (
                    <p className="texto-pequeno">Aún no has registrado cómo te fue.</p>
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

      <p className="texto-pequeno">
        Estas comparaciones describen lo que escribiste. No demuestran una relación de causa y efecto ni miden tu salud.
      </p>
    </>
  )
}

export default Seguimiento
