import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { procesarSolicitud, type ConfigIA } from './server/ai'

function apiIADev(config: ConfigIA): Plugin {
  return {
    name: 'api-ia-dev',
    configureServer(servidor) {
      servidor.middlewares.use('/api/ai', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let crudo = ''
        for await (const trozo of req) crudo += trozo
        let body: unknown
        try {
          body = JSON.parse(crudo)
        } catch {
          res.statusCode = 400
          res.end()
          return
        }
        const resultado = await procesarSolicitud(body, config)
        res.statusCode = resultado.status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(resultado.body))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      apiIADev({
        apiKey: env.ANTHROPIC_API_KEY?.trim(),
        model: env.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5-20251001',
        timeoutMs: Number(env.ANTHROPIC_TIMEOUT_MS) || undefined,
      }),
    ],
    server: {
      port: 5173,
    },
  }
})
