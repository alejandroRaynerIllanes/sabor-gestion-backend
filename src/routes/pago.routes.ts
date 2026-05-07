//src/routes/pago.routes.ts
import { Router } from 'express'
import { generarPagoQR, confirmarPagoManual } from '../controllers/pago.controller'
import { verificarToken } from '../middlewares/auth.middleware'

const router = Router()
router.post('/generar-qr/:pedidoId', verificarToken, generarPagoQR)
router.post('/webhook-simulado', confirmarPagoManual)

export default router
