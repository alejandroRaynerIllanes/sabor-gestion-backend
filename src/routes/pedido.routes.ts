import { Router } from 'express'
import { crearPedido, obtenerPedidos } from '../controllers/pedido.controller'

const router = Router()

router.post('/', crearPedido)
router.get('/', obtenerPedidos)

export default router