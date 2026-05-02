import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'

export const crearPedido = async (req: Request, res: Response) => {
  try {
    const ultimoPedido = await Pedido.findOne().sort({ createdAt: -1 })

    let nuevoNumero = 1
    if (ultimoPedido && ultimoPedido.codigo) {
      const partes = ultimoPedido.codigo.split('-')
      if (partes.length === 2) {
        const numeroAnterior = parseInt(partes[1], 10)
        if (!isNaN(numeroAnterior)) {
          nuevoNumero = numeroAnterior + 1
        }
      }
    }

    const codigoGenerado = `PED-${nuevoNumero.toString().padStart(4, '0')}`

    const nuevoPedido = new Pedido({ ...req.body, codigo: codigoGenerado })
    await nuevoPedido.save()
    
    if (nuevoPedido.mesa) {
      await Mesa.findByIdAndUpdate(nuevoPedido.mesa, { estado: 'Ocupada' })
    }

    const pedidoPoblado = await Pedido.findById(nuevoPedido._id)
      .populate('mesa', 'numero tipo')
      .populate('usuario', 'nombre')
      .populate('detalles.plato', 'nombre precio')

    getIO().emit('nuevo_pedido', pedidoPoblado)
    res.status(201).json(pedidoPoblado)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el pedido', error })
  }
}

export const actualizarEstadoPedido = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const pedido = await Pedido.findByIdAndUpdate(id, { estado }, { new: true })
      .populate('mesa', 'numero tipo')
      .populate('usuario', 'nombre')
      .populate('detalles.plato', 'nombre precio');
      
    if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    
    getIO().emit('pedido_actualizado', pedido);
    res.status(200).json(pedido);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar estado', error });
  }
}

export const obtenerPedidos = async (req: Request, res: Response) => {
  try {
    const pedidos = await Pedido.find()
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre')
      .populate('detalles.plato', 'nombre precio') // Popula el plato DENTRO del array de detalles
    res.status(200).json(pedidos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los pedidos', error })
  }
}
export const cancelarPedido = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const pedido = await Pedido.findById(id)

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' })
    }

    pedido.estado = 'CANCELADO'
    await pedido.save()

    if (pedido.mesa) {
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: 'Libre' })
    }

    res.status(200).json({
      mensaje: 'Pedido anulado y mesa liberada correctamente',
      pedido
    })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar la cancelación', error })
  }
}
