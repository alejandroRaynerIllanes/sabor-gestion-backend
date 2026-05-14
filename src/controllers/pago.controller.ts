// src/controllers/pago.controller.ts
import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'

// 1. Generador de QR (Se mantiene para cuando eligen método QR)
export const generarPagoQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params
    const pedido = await Pedido.findById(pedidoId)

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' }) // Cambiado msg por mensaje para consistencia
      return
    }

    const datosPago = `SABOR_GESTION_ID_${pedido._id}_TOTAL_${pedido.total}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${datosPago}`

    pedido.qrUrl = qrUrl
    await pedido.save()

    res.json({ qrUrl, total: pedido.total })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al generar QR' })
  }
}

// 2. Procesamiento de Pago Final (Conectado a tu Modal)
export const procesarPagoFinal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params

    // Recibimos los datos del modal "Procesar Pago"
    const {
      metodoPago // 'Efectivo', 'Tarjeta', 'QR'
    } = req.body

    const pedido = await Pedido.findById(pedidoId)
    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    if (pedido.estado === 'CERRADO') {
      res.status(400).json({ mensaje: 'Este pedido ya ha sido pagado y cerrado.' });
      return;
    }

    if (pedido.estado !== 'SERVIDO' && pedido.estado !== 'CERRADO') {
      res.status(400).json({ mensaje: 'No se puede procesar el pago. El pedido aún no ha sido entregado al cliente.' })
      return
    }
    
    if (!['Efectivo', 'Tarjeta', 'QR'].includes(metodoPago)) {
      res.status(400).json({ mensaje: 'Método de pago no permitido. Use Efectivo, Tarjeta o QR.' })
      return
    }

    // A. Cálculos matemáticos usando los datos pre-guardados por el mesero
    const ped: any = pedido; // bypass strict typing to read new fields
    const subtotal = ped.subtotalCierre || pedido.total || 0;
    const montoDescuento = ped.montoDescuento || 0;
    const montoPropina = ped.montoPropina || 0;
    const totalFinal = subtotal - montoDescuento + montoPropina;

    // B. Actualizar el pedido a CERRADO (Pagado)
    pedido.estado = 'CERRADO'
    pedido.total = totalFinal // Actualizamos el total al monto real cobrado

    // C. Guardar los datos del pago en la BD (Mapeado a tu nuevo modelo)
    ped.metodoPago = metodoPago
    ped.montoDescuento = montoDescuento
    ped.montoPropina = montoPropina
    ped.subtotalCierre = subtotal

    await pedido.save()

    // D. ¡MAGIA! Liberamos la mesa para el siguiente cliente
    if (pedido.mesa) {
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: 'Libre' })
    }

    // D.2 ¡NUEVO! Notificar por WebSockets para limpiar cocina inmediatamente
    try {
      getIO().emit('cocina:actualizar_tablero', pedido)
      if (pedido.mesa) {
        getIO().emit('mesas:updated', { id: pedido.mesa, status: 'Disponible' })
      }
    } catch (e) {}

    // E. Responder con la data exacta que necesita tu Modal de "Comprobante de Pago"
    res.status(200).json({
      mensaje: 'Pago procesado exitosamente',
      comprobante: {
        pedidoId: pedido._id,
        subtotal: subtotal,
        descuentoAplicado: montoDescuento,
        propinaAplicada: montoPropina,
        totalPagado: totalFinal,
        metodoPago: pedido.metodoPago,
        fecha: new Date()
      }
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al procesar el pago', error: err.message })
  }
}
