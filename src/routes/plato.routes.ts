import { Router } from 'express'
import { crearPlato, obtenerPlatos } from '../controllers/plato.controller'

const router = Router()

router.post('/', crearPlato)
router.get('/', obtenerPlatos)

export default router
