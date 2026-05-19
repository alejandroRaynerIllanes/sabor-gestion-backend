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
      res.status(404).json({ mensaje: 'Pedido no encontrado' }) 
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
// 2. Procesamiento de Pago Final (Conectado a tu Modal)
export const procesarPagoFinal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params

    const {
      metodoPago, 
      porcentajeDescuento = 0,
      porcentajePropina = 0
    } = req.body

    // 1. CORRECCIÓN: Hacemos populate del usuario (Mesero) para saber quién tomó la orden
    const pedido = await Pedido.findById(pedidoId).populate('usuario', 'nombre apellido')
    
    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    if (pedido.estado === 'CERRADO') {
      res.status(400).json({ mensaje: 'Este pedido ya ha sido pagado y cerrado.' })
      return
    }

    if (pedido.estado !== 'ENTREGADO' && pedido.estado !== 'CERRADO') {
      res.status(400).json({ mensaje: 'No se puede procesar el pago. El pedido aún no ha sido entregado.' })
      return
    }
    
    if (!['Efectivo', 'Tarjeta', 'QR'].includes(metodoPago)) {
      res.status(400).json({ mensaje: 'Método de pago no permitido. Use Efectivo, Tarjeta o QR.' })
      return
    }

    const ped: any = pedido
    const subtotal = ped.subtotalCierre || pedido.total || 0
    const montoDescuento = ped.montoDescuento || 0
    const montoPropina = ped.montoPropina || 0
    const totalFinal = subtotal - montoDescuento + montoPropina

    pedido.estado = 'CERRADO'
    pedido.total = totalFinal 

    ped.metodoPago = metodoPago
    ped.montoDescuento = montoDescuento
    ped.montoPropina = montoPropina
    ped.subtotalCierre = subtotal

    await pedido.save()

    if (pedido.mesa) {
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: 'Libre' })
    }

    try {
      const io = getIO()
      io.emit('cocina:actualizar_tablero', pedido)

      if (pedido.mesa) {
        const mesaLiberada = await Mesa.findById(pedido.mesa)
        io.emit('mesas:updated', {
          id: pedido.mesa.toString(),
          status: 'Disponible',
          name: mesaLiberada?.numero || 'Mesa'
        })
        io.emit('mesas:pago_completado', {
          mesaId: pedido.mesa.toString(),
          mesaNombre: mesaLiberada?.numero || 'Mesa',
          pedidoId: pedido._id.toString(),
          mensaje: 'Pago procesado exitosamente'
        })
      }
    } catch (socketError) {
      console.warn('Pago guardado, pero falló la emisión del WebSocket:', socketError)
    }

    // 2. CORRECCIÓN: Extraemos el nombre real del mesero
    const meseroNombre = pedido.usuario 
      ? `${(pedido.usuario as any).nombre || ''} ${(pedido.usuario as any).apellido || ''}`.trim() 
      : 'Sin mesero';

    res.status(200).json({
      mensaje: 'Pago procesado exitosamente',
      comprobante: {
        pedidoId: pedido._id,
        meseroNombre: meseroNombre, // <-- AHORA SÍ VIAJA EL NOMBRE DEL MESERO AL FRONTEND
        subtotal: subtotal,
        descuentoAplicado: montoDescuento,
        propinaAplicada: montoPropina,
        totalPagado: totalFinal,
        metodoPago: ped.metodoPago,
        fecha: new Date()
      }
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al procesar el pago', error: err.message })
  }
}