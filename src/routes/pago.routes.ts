import { Router } from 'express'
import { generarPagoQR, confirmarPagoManual } from '../controllers/pago.controller'

const router = Router()
router.post('/generar-qr/:pedidoId', generarPagoQR)
router.post('/webhook-simulado', confirmarPagoManual)

export default router
