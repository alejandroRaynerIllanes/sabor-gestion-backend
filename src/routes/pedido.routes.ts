import { Router } from 'express'
import { cancelarPedido, crearPedido, obtenerPedidos } from '../controllers/pedido.controller'

const router = Router()

router.post('/', crearPedido)
router.get('/', obtenerPedidos)
router.patch('/:id/cancel', cancelarPedido)

export default router