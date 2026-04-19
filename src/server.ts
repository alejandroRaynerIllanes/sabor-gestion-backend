import app from './app.js'
import { connectDB } from './configs/db.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:3000`)
    console.log(`🩺 Health check: http://localhost:3000/api/health`)
  })
})
