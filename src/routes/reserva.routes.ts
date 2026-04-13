import { Router } from 'express'
import { crearReserva, obtenerReservas } from '../controllers/reserva.controller'

const router = Router()

router.post('/', crearReserva)
router.get('/', obtenerReservas)

export default router