// src/routes/delivery.routes.ts
import { Router } from 'express'
import {
  updateDeliveryStatus,
  getDeliveryQueue,
  updateOrderState,
  acceptOrder,
  rejectOrder,
  actualizarUbicacionRepartidor,
  obtenerDatosMapa
} from '../controllers/delivery.controller'
import { agregarDireccionEntrega } from '../controllers/usuario.controller'

import { verificarToken } from '../middlewares/auth.middleware'
import { permitirRoles } from '../middlewares/rol.middleware'

const router = Router()

// =========================================================================
// 🟢 RUTAS DE CLIENTE Y MAPA (Van ANTES del bloqueo de roles)
// =========================================================================

// Paso 1 del Cliente: Guardar dirección de entrega (solo requiere estar logueado)
router.post('/direccion', verificarToken, agregarDireccionEntrega)

// Mapa: Obtener coordenadas iniciales (Cualquiera con el ID del pedido puede verlo)
router.get('/map/:pedidoId', obtenerDatosMapa)


// =========================================================================
// 🔴 CORTAFUEGOS DE SEGURIDAD: A partir de aquí SÓLO pasa el Repartidor
// =========================================================================
router.use(verificarToken)
router.use(permitirRoles('repartidor', 'Delivery', 'Repartidor')) // Cubrimos mayúsculas y minúsculas por si acaso

router.put('/status', updateDeliveryStatus)
router.get('/queue', getDeliveryQueue)
router.put('/orders/:id/accept', acceptOrder)
router.put('/orders/:id/reject', rejectOrder)
router.put('/orders/:id/state', updateOrderState)

// 🟢 NUEVO: El celular de la moto transmite su GPS aquí
router.put('/location', actualizarUbicacionRepartidor)

export default router