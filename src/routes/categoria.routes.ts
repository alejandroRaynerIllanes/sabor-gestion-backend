import { Router } from 'express'
import { crearCategoria, obtenerCategorias } from '../controllers/categoria.controller'

const router = Router()

router.post('/', crearCategoria)
router.get('/', obtenerCategorias)

export default router
