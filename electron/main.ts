import { app, BrowserWindow, session } from 'electron'
import path from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'

// Importa o app Express (TypeScript) e sobe o servidor embutido
import { createApp } from '../src/server/app'
import { openExternalSafe } from './security'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use Electron's packaging flag to detect dev vs prod
const isDev = !app.isPackaged

const devCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' http://localhost:5173",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:5173 ws://localhost:5173 http://localhost:5174",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

const prodCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:5174",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

async function createWindow() {
  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173'

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
      // Opcional: defina um preload JS se precisar de bridge segura
      // preload: path.join(__dirname, 'preload.js')
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafe(url)
    return { action: 'deny' }
  })

  const allowedOrigins = ['http://localhost:5174']
  if (isDev) {
    allowedOrigins.push(devServerUrl)
  } else {
    allowedOrigins.push('file://')
  }

  win.webContents.on('will-navigate', (event, url) => {
    const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin))
    if (!isAllowed) {
      event.preventDefault()
      void openExternalSafe(url)
    }
  })

  if (isDev) {
    await win.loadURL(devServerUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Sobe o servidor Express embutido
function startEmbeddedServer() {
  const appExpress = createApp()
  const port = Number(process.env.PORT || 5174)
  const server = createHttpServer(appExpress)
  server.listen(port, () => {
    console.log(`Express embutido ouvindo em http://localhost:${port}`)
  })
  return server
}

let serverRef: ReturnType<typeof startEmbeddedServer> | null = null

app.whenReady().then(() => {
  const cspValue = isDev ? devCsp : prodCsp
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [cspValue]
    }

    callback({ responseHeaders })
  })

  serverRef = startEmbeddedServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (serverRef) {
    serverRef.close(() => {
      console.log('Servidor embutido fechado')
    })
  }
})
