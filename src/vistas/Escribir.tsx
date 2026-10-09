import { useState } from 'react'
import { analizarConIA } from '../lib/api'
import {
  analizarDemo,
  aplicarDias,
  normalizarPatrones,
  type DiaAnalizado,
  type PatronCrudo,
} from '../lib/analisis'
import { formatearFecha, nuevoId, type Registro } from '../lib/datos'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'

const MINIMO_REGISTROS = 3
const MAXIMO_REGISTROS_ANALISIS = 30

type Mensaje = { tipo: 'ok' | 'error' | 'info'; texto: string }

function Escribir({ estado, actualizar, ir }: Props) {
  const [borrador, setBorrador] = useState('')
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)
  const [cargando, setCargando] = useState(false)
  const [ayuda, setAyuda] = useState(false)

  function agregarRegistro(texto: string): Registro {
    const registro: Registro = { id: nuevoId(), creado: new Date().toISOString(), texto }
    actualizar((e) => ({ ...e, registros: [...e.registros, registro] }))
    return registro
  }

  function guardar() {
    const texto = borrador.trim()
    if (!texto) {
      setMensaje({ tipo: 'error', texto: 'Escribe algo sobre tu día antes de guardarlo.' })
      return
    }
    const registro = agregarRegistro(texto)
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
        texto: 'Para analizar tus registros necesitamos tu permiso. Marca la casilla de abajo y vuelve a intentarlo.',
      })
      return
    }

    const nuevo = texto ? agregarRegistro(texto) : null
    if (texto) setBorrador('')
    setAyuda(hayRiesgo(texto))

    const registros = nuevo ? [...estado.registros, nuevo] : estado.registros
    const usados = [...registros]
      .sort((a, b) => a.creado.localeCompare(b.creado))
      .slice(-MAXIMO_REGISTROS_ANALISIS)

    if (usados.length < MINIMO_REGISTROS) {
      setMensaje({
        tipo: 'info',
        texto: `Tu día quedó guardado. Necesitas al menos ${MINIMO_REGISTROS} registros para comparar y buscar patrones; por ahora tienes ${usados.length}.`,
      })
      return
    }

    setCargando(true)
    setMensaje(null)
    const respuesta = await analizarConIA(usados)
    setCargando(false)

    if (respuesta.modo === 'error') {
      setMensaje({ tipo: 'error', texto: `${respuesta.mensaje} Tu registro sí quedó guardado.` })
      return
    }

    let crudos: PatronCrudo[]
    let dias: DiaAnalizado[]
    let modo: 'ia' | 'demo'
    if (respuesta.modo === 'ia') {
      crudos = respuesta.datos.patrones ?? []
      dias = respuesta.datos.dias ?? []
      modo = 'ia'
      if (respuesta.datos.senalRiesgo) setAyuda(true)
    } else {
      const demo = analizarDemo(usados)
      crudos = demo.patrones
      dias = demo.dias
      modo = 'demo'
    }

    const patrones = normalizarPatrones(crudos, usados, modo)
    actualizar((e) => ({
      ...e,
      registros: aplicarDias(e.registros, dias),
      patrones,
      analisis: { creado: new Date().toISOString(), registrosUsados: usados.length, modo },
    }))

    setMensaje({
      tipo: 'ok',
      texto:
        patrones.length > 0
          ? `Encontramos ${patrones.length} posible(s) patrón(es) en tus registros.`
          : 'Por ahora no encontramos situaciones que se repitan en al menos dos días.',
    })
  }

  return (
    <>
      <header className="encabezado-vista">
        <h2>¿Cómo estuvo tu día hoy?</h2>
        <p>Puedes contarme qué pasó, cómo te sentiste, qué te preocupó y qué hiciste durante el día.</p>
      </header>

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        <textarea
          className="campo-texto"
          aria-label="Relato de tu día"
          placeholder="Escribe libremente, no hay una forma correcta de hacerlo…"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
        />

        <p className="texto-pequeno">
          Tu registro es personal. Se guarda en este dispositivo y no se sincroniza automáticamente entre dispositivos.
          Solo se envía a un servicio de IA si lo permites.
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

        {cargando && <p className="cargando">Analizando tus registros…</p>}

        {mensaje && (
          <p
            role="status"
            className={`aviso ${mensaje.tipo === 'ok' ? 'aviso--ok' : mensaje.tipo === 'error' ? 'aviso--error' : ''}`}
          >
            {mensaje.texto}
          </p>
        )}

        {estado.analisis && estado.patrones.length > 0 && mensaje?.tipo === 'ok' && (
          <div className="acciones">
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
