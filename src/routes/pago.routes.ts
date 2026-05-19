// src/routes/pago.routes.ts
import { Router } from 'express'
import { generarPagoQR, procesarPagoFinal } from '../controllers/pago.controller' // <-- Importamos la nueva función
import { verificarToken } from '../middlewares/auth.middleware'
import { permitirRoles } from '../middlewares/rol.middleware'

const router = Router()

// 1. Ruta para cuando el cliente quiere pagar con QR
router.post('/generar-qr/:pedidoId', verificarToken, generarPagoQR)

// 2. NUEVA RUTA: La que conecta con tu botón naranja de "Confirmar Pago"
router.post('/:pedidoId/procesar', verificarToken, permitirRoles('Cajero', 'Administrador'),procesarPagoFinal)

export default router
