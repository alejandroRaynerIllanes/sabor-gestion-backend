import { Request, Response } from 'express'
import Pedido from '../models/Pedido'

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