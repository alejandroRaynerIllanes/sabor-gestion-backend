import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa';

export const crearPedido = async (req: Request, res: Response) => {
  try {
    const nuevoPedido = new Pedido(req.body)
    await nuevoPedido.save()
    res.status(201).json(nuevoPedido)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el pedido', error })
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
    const { id } = req.params;

    const pedido = await Pedido.findById(id);

    if (!pedido) {
      return res.status(404).json({ mensaje: 'Pedido no encontrado' });
    }

    pedido.estado = 'CANCELADO';
    await pedido.save();

    if (pedido.mesa) {
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: 'Libre' }); 
    }

    res.status(200).json({ 
      mensaje: 'Pedido anulado y mesa liberada correctamente', 
      pedido 
    });

  } catch (error) {
    res.status(500).json({ mensaje: 'Error al procesar la cancelación', error });
  }
};