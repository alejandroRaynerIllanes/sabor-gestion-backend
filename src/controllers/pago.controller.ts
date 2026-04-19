import { Request, Response } from 'express'
import Pedido from '../models/Pedido'

export const generarPagoQR = async (req: Request, res: Response) => {
  const { pedidoId } = req.params
  const pedido = await Pedido.findById(pedidoId)

  if (!pedido) return res.status(404).json({ msg: 'Pedido no encontrado' })

  // Simulamos el string que generaría una pasarela real con el monto
  const datosPago = `SABOR_GESTION_ID_${pedido._id}_TOTAL_${pedido.total}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${datosPago}`

  pedido.qrUrl = qrUrl
  await pedido.save()

  res.json({ qrUrl, total: pedido.total })
}

// WEBHOOK SIMULADO: Para que tú como DEV confirmes el pago
export const confirmarPagoManual = async (req: Request, res: Response) => {
  const { pedidoId } = req.body
  await Pedido.findByIdAndUpdate(pedidoId, { status: 'pagado' })
  res.json({ msg: 'Pago confirmado exitosamente (Simulado)' })
}
