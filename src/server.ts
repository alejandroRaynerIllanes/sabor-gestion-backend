//src/server.ts
import app from './app'
import { connectDB } from './configs/db'
import dotenv from 'dotenv'
import { createServer } from 'http' // <--- NUEVO
import { initSocket } from './socket/socket' // <--- NUEVO

dotenv.config()

const PORT = process.env.PORT || 3000
const httpServer = createServer(app) // Creamos el servidor HTTP con Express

// Inicializamos el Socket
initSocket(httpServer)

// Inicializar la base de datos y luego arrancar el servidor
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:3000`)
    console.log(`🩺 Health check: http://localhost:3000/api/health`)
    console.log(`🚀 Servidor con WebSockets en http://localhost:${PORT}`)
  })
})
