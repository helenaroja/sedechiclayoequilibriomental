import { useState } from 'react'
import { procesarDia, recalcularPatrones, reintentarRutina } from '../lib/flujos'
import { fechaClave, formatearFecha, nuevoId, registrosDelUsuario, type Registro } from '../lib/datos'
import { hayRiesgo } from '../lib/seguridad'
import type { Props } from '../lib/vista'
import AvisoAyuda from './AvisoAyuda'
import { BannerRacha } from './Racha'

type Estado = 'inactivo' | 'analizando' | 'rutina' | 'patrones'

const ETIQUETAS: Record<Estado, string> = {
  inactivo: '',
  analizando: 'Analizando tu día con IA…',
  rutina: 'Preparando una rutina a partir de tu análisis…',
  patrones: 'Revisando tus días anteriores…',
}

function Escribir({ estado, actualizar, ir }: Props) {
  const [borrador, setBorrador] = useState('')
  const [fase, setFase] = useState<Estado>('inactivo')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null)
  const [ayuda, setAyuda] = useState(false)

  const registros = registrosDelUsuario(estado)
  const ultimo = [...registros].sort((a, b) => b.creado.localeCompare(a.creado))[0]
  const pendiente = registros.find((r) => r.errorAnalisis && !r.analisis) ?? null

  function aplicarRegistro(actualizado: Registro) {
    actualizar((e) => ({ ...e, registros: e.registros.map((r) => (r.id === actualizado.id ? actualizado : r)) }))
  }

  function guardarSinAnalizar() {
    const texto = borrador.trim()
    if (!texto) {
      setMensaje({ tipo: 'error', texto: 'Escribe algo sobre tu día antes de guardarlo.' })
      return
    }
    const registro: Registro = { id: nuevoId(), usuarioId: estado.usuarioId, creado: new Date().toISOString(), texto }
    actualizar((e) => ({ ...e, registros: [...e.registros, registro] }))
    setBorrador('')
    setAyuda(hayRiesgo(texto))
    setMensaje({ tipo: 'ok', texto: `Tu día quedó guardado el ${formatearFecha(registro.creado)}. Todavía no tiene análisis.` })
  }

  async function analizar() {
    const texto = borrador.trim()
    if (!texto) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu día antes de analizarlo.' })
      return
    }
    if (!estado.consentimiento) {
      setMensaje({
        tipo: 'error',
        texto: 'Para analizar tu día necesitamos tu permiso para enviarlo a un servicio de IA. Marca la casilla de abajo.',
      })
      return
    }

    const registro: Registro = { id: nuevoId(), usuarioId: estado.usuarioId, creado: new Date().toISOString(), texto }
    actualizar((e) => ({ ...e, registros: [...e.registros, registro] }))
    setBorrador('')
    setAyuda(hayRiesgo(texto))
    setMensaje(null)
    setFase('analizando')

    const resultado = await procesarDia({ ...estado, registros: [...estado.registros, registro] }, registro)
    setFase('inactivo')
    aplicarRegistro(resultado.registro)

    if (resultado.registro.analisis?.senalRiesgo) setAyuda(true)

    if (resultado.rutina) actualizar((e) => ({ ...e, rutinas: [...e.rutinas, resultado.rutina!] }))

    const patrones = resultado.patrones
    if (patrones?.ok) {
      const datos = patrones.datos
      actualizar((e) => ({ ...e, patrones: datos, patronesError: undefined, patronesCreado: new Date().toISOString() }))
    } else if (patrones) {
      actualizar((e) => ({ ...e, patronesError: patrones.mensaje }))
    }

    if (!resultado.registro.analisis) {
      setMensaje({
        tipo: 'error',
        texto: `Tu día quedó guardado, pero el análisis no pudo completarse. ${resultado.registro.errorAnalisis ?? ''} Puedes reintentarlo abajo.`,
      })
      return
    }

    const diasDistintos = new Set([...registros, registro].map((r) => fechaClave(r.creado))).size
    const nota =
      diasDistintos < 2
        ? ' Con un solo día todavía no podemos confirmar patrones; con más días podremos compararlos.'
        : ''
    const rutinaNota = resultado.rutina ? ' Ya tienes una rutina en "Romper el ciclo".' : ` La rutina no se pudo generar: ${resultado.registro.errorRutina ?? ''}`
    setMensaje({ tipo: 'ok', texto: `Tu día quedó analizado.${nota}${rutinaNota}` })
  }

  async function reintentarAnalisis(registro: Registro) {
    setFase('analizando')
    setMensaje(null)
    const resultado = await procesarDia(estado, registro)
    setFase('inactivo')
    aplicarRegistro(resultado.registro)
    if (resultado.rutina) actualizar((e) => ({ ...e, rutinas: [...e.rutinas, resultado.rutina!] }))
    if (resultado.patrones?.ok) actualizar((e) => ({ ...e, patrones: resultado.patrones!.ok ? resultado.patrones!.datos : e.patrones, patronesError: undefined }))
    setMensaje(
      resultado.registro.analisis
        ? { tipo: 'ok', texto: 'Tu día quedó analizado. El resultado quedó guardado con tu registro.' }
        : { tipo: 'error', texto: `El análisis sigue sin completarse. ${resultado.registro.errorAnalisis ?? ''}` },
    )
  }

  async function reintentarRutinaDelDia(registro: Registro) {
    setFase('rutina')
    const r = await reintentarRutina(estado, registro)
    setFase('inactivo')
    aplicarRegistro(r.registro)
    if (r.rutina) actualizar((e) => ({ ...e, rutinas: [...e.rutinas, r.rutina!] }))
    setMensaje(r.rutina ? { tipo: 'ok', texto: 'Ya tienes una rutina en "Romper el ciclo".' } : { tipo: 'error', texto: `La rutina sigue sin generarse. ${r.registro.errorRutina ?? ''}` })
  }

  async function reintentarPatrones() {
    setFase('patrones')
    const r = await recalcularPatrones(estado)
    setFase('inactivo')
    if (r.ok) actualizar((e) => ({ ...e, patrones: r.datos, patronesError: undefined, patronesCreado: new Date().toISOString() }))
    else actualizar((e) => ({ ...e, patronesError: r.mensaje }))
  }

  const cargando = fase !== 'inactivo'

  return (
    <>
      <header className="encabezado-vista">
        <h2>¿Cómo estuvo tu día hoy?</h2>
        <p>Puedes contarme qué pasó, cómo te sentiste, qué te preocupó y qué hiciste durante el día.</p>
      </header>

      <BannerRacha registros={registros} compacto />

      {ayuda && <AvisoAyuda />}

      <section className="tarjeta">
        <textarea
          className="campo-texto"
          aria-label="Relato de tu día"
          placeholder="Escribe libremente, como te salga. No hay una forma correcta de hacerlo…"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          disabled={cargando}
        />

        <p className="texto-pequeno">
          Tu texto se guarda tal como lo escribes, en este navegador. No se sincroniza automáticamente entre dispositivos. Solo
          se envía a un servicio de IA si lo permites.
        </p>

        <label className="casilla">
          <input type="checkbox" checked={estado.consentimiento} onChange={(e) => actualizar((s) => ({ ...s, consentimiento: e.target.checked }))} />
          <span>
            Acepto que mis relatos se envíen a un servicio de inteligencia artificial (Anthropic) para analizarlos. Puedo retirar
            este permiso en "Mis datos".
          </span>
        </label>

        <div className="acciones">
          <button type="button" className="btn btn--secundario" onClick={guardarSinAnalizar} disabled={cargando}>
            Guardar mi día
          </button>
          <button type="button" className="btn btn--principal" onClick={analizar} disabled={cargando}>
            Analizar mi día
          </button>
          <button type="button" className="btn btn--suave" onClick={() => ir('historial')}>
            Consultar registros anteriores
          </button>
        </div>

        {cargando && <p className="cargando">{ETIQUETAS[fase]}</p>}

        {mensaje && (
          <p role="status" className={`aviso ${mensaje.tipo === 'ok' ? 'aviso--ok' : mensaje.tipo === 'error' ? 'aviso--error' : ''}`}>
            {mensaje.texto}
          </p>
        )}

        {!cargando && ultimo && ultimo.errorAnalisis && !ultimo.analisis && (
          <div className="acciones">
            <button type="button" className="btn btn--principal btn--pequeno" onClick={() => reintentarAnalisis(ultimo)}>
              Reintentar análisis de este día
            </button>
          </div>
        )}

        {!cargando && ultimo?.analisis && ultimo.errorRutina && (
          <div className="acciones">
            <button type="button" className="btn btn--suave btn--pequeno" onClick={() => reintentarRutinaDelDia(ultimo)}>
              Reintentar generar la rutina
            </button>
          </div>
        )}

        {!cargando && estado.patronesError && (
          <div className="aviso aviso--error">
            <p>No pudimos actualizar tus patrones. {estado.patronesError}</p>
            <button type="button" className="btn btn--suave btn--pequeno" onClick={reintentarPatrones}>
              Reintentar patrones
            </button>
          </div>
        )}

        {!cargando && pendiente && pendiente !== ultimo && (
          <p className="texto-pequeno">Tienes un día sin análisis completo. Puedes reintentarlo desde "Historial".</p>
        )}
      </section>
    </>
  )
}

export default Escribir
