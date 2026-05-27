// src/services/pedido.service.ts
// ─── Servicio de Lógica de Negocio de Pedidos ──────────────────────────────

export class PedidoService {
  /**
   * Formatea un pedido poblado para enviar su estructura completa
   * a los websockets o endpoints de la Caja.
   */
  static formatearPayloadCaja(pedido: any, mesaOverride?: any) {
    const mesa = mesaOverride || pedido.mesa;
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
      total: (pedido.subtotalCierre || pedido.total || 0) - (pedido.montoDescuento || 0) + (pedido.montoPropina || 0),
      tiempoEsperaMinutos: pedido.updatedAt || pedido.createdAt || pedido.fechaHora
        ? Math.floor((Date.now() - new Date(pedido.updatedAt || pedido.createdAt || pedido.fechaHora).getTime()) / 60000)
        : 0,
      items: pedido.detalles?.map((detalle: any) => ({
        platoId: detalle.plato?._id || detalle.plato,
        nombre: detalle.plato?.nombre || 'Plato no disponible',
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario,
        subtotal: detalle.subtotal,
        observacion: detalle.observacion
      })) || []
    };
  }
}