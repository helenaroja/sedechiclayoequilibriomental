import { procesarSolicitud } from '../server/ai.js'

type Peticion = { method?: string; body?: unknown }
type Respuesta = { status: (codigo: number) => { json: (cuerpo: unknown) => void } }

export default async function handler(req: Peticion, res: Respuesta) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'metodo_no_permitido' })
    return
  }
  const resultado = await procesarSolicitud(req.body, {
    apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
    model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5-20251001',
    timeoutMs: Number(process.env.ANTHROPIC_TIMEOUT_MS) || undefined,
  })
  res.status(resultado.status).json(resultado.body)
}
