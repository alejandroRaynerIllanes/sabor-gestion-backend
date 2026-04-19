import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'

// 1. Importamos las rutas de la actualización (Equipo)
import authRoutes from './routes/auth.routes'
import usuarioRoutes from './routes/usuario.routes'
import categoriaRoutes from './routes/categoria.routes'
import mesaRoutes from './routes/mesa.routes'
import platoRoutes from './routes/plato.routes'
import reservaRoutes from './routes/reserva.routes'
import pedidoRoutes from './routes/pedido.routes'
import pagoRoutes from './routes/pago.routes'

const app: Application = express()

// Middlewares globales
app.use(morgan('dev'))
app.use(cors())
app.use(express.json())

// Rutas de tus cambios
app.use('/api/upload', uploadRouter)

// 2. Conectamos las rutas oficiales de la actualización
app.use('/api/auth', authRoutes)
app.use('/api/users', usuarioRoutes)
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/categorias', categoriaRoutes)
app.use('/api/mesas', mesaRoutes)
app.use('/api/platos', platoRoutes)
app.use('/api/reservas', reservaRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/pago', pagoRoutes)

export default app
