// src/routes/pedido.routes.ts
import { Router } from 'express'
import {
  cancelarPedido,
  crearPedido,
  obtenerPedidos,
  actualizarEstadoPedido // <-- Añadimos la nueva función
} from '../controllers/pedido.controller'
import { verificarToken } from '../middlewares/auth.middleware'

const router = Router()

// Crear un nuevo pedido (Mesero)
router.post('/', verificarToken, crearPedido)

// Listar todos los pedidos (Cocina / Admin)
router.get('/', verificarToken, obtenerPedidos)

// Actualizar el estado del pedido: "Por hacer" -> "Cocinando" -> "Listos" (Cocina)
router.patch('/:id/estado', verificarToken, actualizarEstadoPedido)

// Cancelar un pedido y liberar la mesa
router.patch('/:id/cancel', verificarToken, cancelarPedido)

export default router
