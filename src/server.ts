import app from './app'
import { connectDB } from './configs/db'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000

// Inicializar la base de datos y luego arrancar el servidor
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:3000`)
    console.log(`🩺 Health check: http://localhost:3000/api/health`)
  })
})
