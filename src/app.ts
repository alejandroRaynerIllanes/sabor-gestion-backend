//src/app.ts
import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'

// 1. Importamos las rutas de la actualización (Equipo)
import authRoutes from './routes/auth.routes'
import usuarioRoutes from './routes/usuario.routes'
import categoriaRoutes from './routes/categoria.routes'
import mesaRoutes from './routes/mesa.routes'
import ubicacionRoutes from './routes/ubicacion.routes'
import platoRoutes from './routes/plato.routes'
import reservaRoutes from './routes/reserva.routes'
import pedidoRoutes from './routes/pedido.routes'
import pagoRoutes from './routes/pago.routes'

// Importamos la ruta de tus cambios locales
import uploadRouters from './routes/upload.routes.js'

const app: Application = express()

// Middlewares globales
app.use(morgan('dev'))
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://sabor-gestion-backend-sars.onrender.com',
      'https://tis-pied.vercel.app' // Pon aquí la URL de tu front si ya tiene deploy
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true })) // <-- Esto venía de tus cambios

// Rutas de tus cambios
app.use('/api/upload', uploadRouters)

// 2. Conectamos las rutas oficiales de la actualización
app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/categorias', categoriaRoutes)
app.use('/api/mesas', mesaRoutes)
app.use('/api/ubicaciones', ubicacionRoutes)
app.use('/api/platos', platoRoutes)
app.use('/api/reservas', reservaRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/pago', pagoRoutes)

// Health check / Ruta de prueba
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API de Sabor & Gestión funcionando correctamente 🚀'
  })
})

export default app
