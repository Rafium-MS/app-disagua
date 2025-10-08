import { createServer } from 'node:http'
import { createApp } from './app'

const port = Number(process.env.PORT || 5174)
const app = createApp()
const server = createServer(app)

server.listen(port, () => {
  console.log(`Servidor Express rodando em http://localhost:${port}`)
})

