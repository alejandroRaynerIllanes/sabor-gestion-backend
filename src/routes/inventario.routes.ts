// src/routes/inventario.routes.ts
import { Router } from 'express'
import {
  obtenerEstadoInventario,
  registrarEntradaStock
} from '../controllers/inventario.controller'

// Middlewares de seguridad
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

// GET: Todos los usuarios con sesión iniciada pueden ver el estado del inventario
router.get('/estado', verificarToken, obtenerEstadoInventario)

// POST: Solo el Administrador puede registrar entradas manuales de stock
router.post('/entrada', verificarToken, soloAdmins, registrarEntradaStock)

export default router
