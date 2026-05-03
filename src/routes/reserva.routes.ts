import { Router } from 'express'
import { crearReserva, obtenerReservas } from '../controllers/reserva.controller'
import { verificarToken } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', verificarToken, crearReserva)
router.get('/', verificarToken, obtenerReservas)

export default router
