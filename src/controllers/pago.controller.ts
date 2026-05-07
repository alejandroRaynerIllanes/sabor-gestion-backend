// src/controllers/pago.controller.ts
import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'

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
    const { pedidoId } = req.params;
    
    // Recibimos los datos del modal "Procesar Pago"
    const { 
      metodoPago, // 'Transferencia', 'Efectivo', 'Tarjeta', 'QR'
      porcentajeDescuento = 0, 
      porcentajePropina = 0 
    } = req.body;

    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' });
      return;
    }

    // A. Cálculos matemáticos basados en tu UI
    const subtotal = pedido.total; // El total original antes de descuentos
    const montoDescuento = subtotal * (porcentajeDescuento / 100);
    const subtotalConDescuento = subtotal - montoDescuento;
    const montoPropina = subtotalConDescuento * (porcentajePropina / 100);
    const totalFinal = subtotalConDescuento + montoPropina;

    // B. Actualizar el pedido a CERRADO (Pagado)
    pedido.estado = 'CERRADO';
    pedido.total = totalFinal; // Actualizamos el total al monto real cobrado
    
    // C. Guardar los datos del pago en la BD (Mapeado a tu nuevo modelo)
    pedido.metodoPago = metodoPago || 'Efectivo'; // Valor por defecto si no llega
    pedido.montoDescuento = montoDescuento;
    pedido.montoPropina = montoPropina;
    pedido.subtotalCierre = subtotal; // Para auditoría, guardamos el original

    await pedido.save();

    // D. ¡MAGIA! Liberamos la mesa para el siguiente cliente
    if (pedido.mesa) {
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: 'Libre' });
    }

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
    });

  } catch (error) {
    const err = error as Error;
    res.status(500).json({ mensaje: 'Error al procesar el pago', error: err.message });
  }
}