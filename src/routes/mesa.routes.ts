import { Router } from 'express'
import { crearMesa, obtenerMesas } from '../controllers/mesa.controller'

const router = Router()

router.post('/', crearMesa)
router.get('/', obtenerMesas)

export default router
