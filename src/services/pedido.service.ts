// src/services/pedido.service.ts
// ─── Servicio de Lógica de Negocio de Pedidos ──────────────────────────────
import Pedido from '../models/Pedido'
import { ESTADOS_PEDIDO } from '../utils/constants'
import { procesarDescuentoPedido } from './inventario.service'

// ─── Tipos de retorno ────────────────────────────────────────────────────────

export interface ResultadoActualizarEstado {
  pedidoActualizado: any
  /** true cuando el nuevo estado activa la alerta "¡Listo!" hacia los meseros */
  disparaAlertaListo: boolean
}

// ─── Clase principal ─────────────────────────────────────────────────────────

export class PedidoService {
  /**
   * Formatea un pedido poblado para enviar su estructura completa
   * a los websockets o endpoints de la Caja.
   */
  static formatearPayloadCaja(pedido: any, mesaOverride?: any) {
    const mesa = mesaOverride || pedido.mesa
    return {
      pedidoId: pedido._id,
      codigo: pedido.codigo || `PED-${String(pedido._id).slice(-4).toUpperCase()}`,
      mesaId: mesa?._id || mesa,
      mesaNombre: mesa?.numero || 'Mesa sin asignar',
      meseroNombre: pedido.usuario
        ? `${pedido.usuario.nombre || ''} ${pedido.usuario.apellido || ''}`.trim()
        : 'Sin mesero',
      subtotal: pedido.subtotalCierre || pedido.total || 0,
      descuento: pedido.montoDescuento || 0,
      propina: pedido.montoPropina || 0,
      total:
        (pedido.subtotalCierre || pedido.total || 0) -
        (pedido.montoDescuento || 0) +
        (pedido.montoPropina || 0),
      tiempoEsperaMinutos:
        pedido.updatedAt || pedido.createdAt || pedido.fechaHora
          ? Math.floor(
              (Date.now() -
                new Date(pedido.updatedAt || pedido.createdAt || pedido.fechaHora).getTime()) /
                60000
            )
          : 0,
      items:
        pedido.detalles?.map((detalle: any) => ({
          platoId: detalle.plato?._id || detalle.plato,
          nombre: detalle.plato?.nombre || 'Plato no disponible',
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          subtotal: detalle.subtotal,
          observacion: detalle.observacion
        })) || []
    }
  }

  /**
   * Lógica de negocio pura para actualizar el estado de un pedido.
   * No conoce Request/Response ni WebSockets — eso queda en el controlador.
   *
   * @param pedidoId  ID del pedido a actualizar
   * @param nuevoEstado  Nuevo estado (ej. 'EN_PREPARACION', 'ENTREGADO', 'Listos')
   * @returns El pedido actualizado y un flag que indica si se debe emitir alerta de "listo"
   * @throws Error si el pedido no existe (el controlador lo convierte en 404)
   */
  static async actualizarEstadoService(
    pedidoId: string,
    nuevoEstado: string
  ): Promise<ResultadoActualizarEstado> {
    // 1. Actualizar estado en BD con populate completo
    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      pedidoId,
      { estado: nuevoEstado },
      { new: true }
    )
      .populate('mesa', 'numero')
      .populate('detalles.plato', 'nombre precio')
      .populate('usuario', 'nombre apellido')

    if (!pedidoActualizado) {
      throw new Error('PEDIDO_NO_ENCONTRADO')
    }

    // 2. Determinar si el nuevo estado activa la alerta "¡Listo!"
    const disparaAlertaListo =
      nuevoEstado === ESTADOS_PEDIDO.ENTREGADO || nuevoEstado === 'Listos'

    // 3. Descontar inventario si el pedido pasa a "listo"
    if (disparaAlertaListo) {
      try {
        await procesarDescuentoPedido(pedidoActualizado._id.toString())
      } catch (inventarioError) {
        // El fallo de inventario NO interrumpe el flujo principal del pedido
        console.error(
          `[Inventario] Error al procesar descuento para pedido ${pedidoActualizado._id}:`,
          inventarioError
        )
      }
    }

    return { pedidoActualizado, disparaAlertaListo }
  }
}
