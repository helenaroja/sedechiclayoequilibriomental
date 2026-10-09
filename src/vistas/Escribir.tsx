import { useState } from 'react'
import { analizarConIA } from '../lib/api'
import { analizarDemo, aplicarAnalisis, normalizarPatrones, type DiaCrudo, type PatronCrudo } from '../lib/analisis'
import { formatearFecha, nuevoId, type Registro } from '../lib/datos'
import { diasConRegistro } from '../lib/racha'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'
import { BannerRacha } from './Racha'

const MAXIMO_REGISTROS_ANALISIS = 30

type Mensaje = { tipo: 'ok' | 'error' | 'info'; texto: string }

function Escribir({ estado, actualizar, ir }: Props) {
  const [borrador, setBorrador] = useState('')
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ayuda, setAyuda] = useState(false)

  function crearRegistro(texto: string): Registro {
    return { id: nuevoId(), creado: new Date().toISOString(), texto }
  }

  function guardar() {
    const texto = borrador.trim()
    if (!texto) {
      setMensaje({ tipo: 'error', texto: 'Escribe algo sobre tu día antes de guardarlo.' })
      return
    }
    const registro = crearRegistro(texto)
    actualizar((e) => ({ ...e, registros: [...e.registros, registro] }))
    setBorrador('')
    setAyuda(hayRiesgo(texto))
    setMensaje({ tipo: 'ok', texto: `Tu día quedó guardado el ${formatearFecha(registro.creado)}.` })
  }

  async function analizar() {
    const texto = borrador.trim()
    if (!texto && estado.registros.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu día para poder analizarlo.' })
      return
    }
    if (!estado.consentimiento) {
      setMensaje({
        tipo: 'error',
        texto: 'Para analizar tu día necesitamos tu permiso para enviarlo a un servicio de IA. Marca la casilla de abajo.',
      })
      return
    }

    const nuevo = texto ? crearRegistro(texto) : null
    if (nuevo) {
      actualizar((e) => ({ ...e, registros: [...e.registros, nuevo] }))
      setBorrador('')
    }
    setAyuda(hayRiesgo(texto))

    const registros = nuevo ? [...estado.registros, nuevo] : estado.registros
    const usados = [...registros].sort((a, b) => a.creado.localeCompare(b.creado)).slice(-MAXIMO_REGISTROS_ANALISIS)

    setCargando(true)
    setMensaje(null)
    const respuesta = await analizarConIA(usados)
    setCargando(false)

    if (respuesta.modo === 'error') {
      setMensaje({ tipo: 'error', texto: respuesta.mensaje })
      return
    }

    let crudos: PatronCrudo[]
    let dias: DiaCrudo[]
    let modo: 'ia' | 'demo'
    if (respuesta.modo === 'ia') {
      crudos = respuesta.datos.patrones ?? []
      dias = (respuesta.datos.dias ?? []) as DiaCrudo[]
      modo = 'ia'
      if (respuesta.datos.senalRiesgo) setAyuda(true)
    } else {
      const demo = analizarDemo(usados)
      crudos = demo.patrones
      dias = demo.dias
      modo = 'demo'
    }

    const creado = new Date().toISOString()
    const patrones = normalizarPatrones(crudos, usados, modo, estado.patrones)
    actualizar((e) => ({
      ...e,
      registros: aplicarAnalisis(e.registros, dias, creado),
      patrones,
      analisis: { creado, registrosUsados: usados.length, modo },
    }))

    const diasDistintos = diasConRegistro(usados).size
    const notaDatos =
      diasDistintos < 2
        ? ' Con un solo día todavía no podemos confirmar patrones; con más registros podremos compararlos.'
        : ''
    setMensaje({
      tipo: 'ok',
      texto: `Tu día quedó analizado.${notaDatos}${modo === 'demo' ? ' Este análisis es de demostración y no usa IA.' : ''}`,
    })
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>¿Cómo estuvo tu día hoy?</h2>
        <p>Puedes contarme qué pasó, cómo te sentiste, qué te preocupó y qué hiciste durante el día.</p>
      </header>

      <BannerRacha registros={estado.registros} compacto />

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        <textarea
          className="campo-texto"
          aria-label="Relato de tu día"
          placeholder="Escribe libremente, como te salga. No hay una forma correcta de hacerlo…"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
        />

        <p className="texto-pequeno">
          Tu registro es personal y se guarda en este dispositivo; no se sincroniza automáticamente entre dispositivos.
          Tu texto original se guarda tal como lo escribes. Solo se envía a un servicio de IA si lo permites.
        </p>

        <label className="casilla">
          <input
            type="checkbox"
            checked={estado.consentimiento}
            onChange={(e) => actualizar((s) => ({ ...s, consentimiento: e.target.checked }))}
          />
          <span>
            Acepto que mis relatos se envíen a un servicio de inteligencia artificial (Anthropic) para analizarlos. Puedo
            retirar este permiso en "Mis datos".
          </span>
        </label>

        <div className="acciones">
          <button type="button" className="btn btn--secundario" onClick={guardar} disabled={cargando}>
            Guardar mi día
          </button>
          <button type="button" className="btn btn--principal" onClick={analizar} disabled={cargando}>
            Analizar mi día
          </button>
          <button type="button" className="btn btn--suave" onClick={() => ir('historial')}>
            Consultar registros anteriores
          </button>
        </div>

        {cargando && <p className="cargando">Analizando tu día…</p>}

        {mensaje && (
          <p
            role="status"
            className={`aviso ${mensaje.tipo === 'ok' ? 'aviso--ok' : mensaje.tipo === 'error' ? 'aviso--error' : ''}`}
          >
            {mensaje.texto}
          </p>
        )}

        {estado.analisis && mensaje?.tipo === 'ok' && (
          <div className="acciones">
            <button type="button" className="btn btn--suave" onClick={() => ir('historial')}>
              Ver mi interpretación
            </button>
            <button type="button" className="btn btn--suave" onClick={() => ir('patrones')}>
              Ver mi patrón
            </button>
          </div>
        )}
      </section>
    </>
  )
}

export default Escribir
