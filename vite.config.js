import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import fs from 'fs'
import path from 'path'

function getApiKey() {
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8')
    const match = content.match(/ANTHROPIC_API_KEY=(.+)/)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

function anthropicProxy() {
  const apiKey = getApiKey()
  return {
    name: 'anthropic-proxy',
    configureServer(server) {
      server.middlewares.use('/api/anthropic', (req, res) => {
        const chunks = []
        req.on('data', chunk => chunks.push(chunk))
        req.on('end', () => {
          const body = Buffer.concat(chunks)
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: req.method,
            headers: {
              'content-type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'content-length': body.length,
            }
          }
          const proxyReq = https.request(options, proxyRes => {
            res.writeHead(proxyRes.statusCode, {
              'content-type': proxyRes.headers['content-type'] || 'application/json',
            })
            proxyRes.pipe(res)
          })
          proxyReq.on('error', err => { res.writeHead(500); res.end(err.message) })
          proxyReq.write(body)
          proxyReq.end()
        })
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), anthropicProxy()],
})
