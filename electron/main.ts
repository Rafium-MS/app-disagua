import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { createServer as createHttpServer } from 'node:http'
import { fileURLToPath } from 'node:url'

// Importa o app Express (TypeScript) e sobe o servidor embutido
import { createApp } from '../src/server/app'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Use Electron's packaging flag to detect dev vs prod
const isDev = !app.isPackaged

async function createWindow() {
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

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL || 'http://localhost:5173'
    await win.loadURL(url)
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
