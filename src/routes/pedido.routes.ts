import { Router } from 'express'
import { cancelarPedido, crearPedido, obtenerPedidos } from '../controllers/pedido.controller'
import { verificarToken } from '../middlewares/auth.middleware'

const router = Router()

router.post('/', verificarToken, crearPedido)
router.get('/', verificarToken, obtenerPedidos)
router.patch('/:id/cancel', verificarToken, cancelarPedido)

export default router
