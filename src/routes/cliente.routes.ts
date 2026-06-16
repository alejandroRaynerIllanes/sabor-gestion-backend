import { Router } from 'express'
import { registrarCliente, loginCliente, obtenerClientes } from '../controllers/cliente.controller'
import { verificarToken } from '../middlewares/auth.middleware'
import { permitirRoles } from '../middlewares/rol.middleware'

const router = Router()

// Rutas públicas
router.post('/auth/register', registrarCliente)
router.post('/auth/login', loginCliente)

// Rutas protegidas (Solo Administrador)
router.get('/', verificarToken, permitirRoles('Administrador'), obtenerClientes)

export default router
