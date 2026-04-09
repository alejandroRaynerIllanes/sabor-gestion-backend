import express, { Application, Request, Response } from 'express'
import cors from 'cors'

const app: Application = express()

// Middlewares globales
app.use(cors())
app.use(express.json()) // Permite recibir JSON en los POST/PUT

// Ruta de prueba para verificar que la API responde
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API de Sabor & Gestión funcionando correctamente 🚀'
  })
})

export default app
