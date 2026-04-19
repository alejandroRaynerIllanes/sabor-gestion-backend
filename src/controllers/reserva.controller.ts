import { Request, Response } from 'express'
import Reserva from '../models/Reserva'
import { getIO } from '../socket/socket'

export const crearReserva = async (req: Request, res: Response) => {
  try {
    const nuevaReserva = new Reserva(req.body)
    await nuevaReserva.save()

    // EMITIR EVENTO
    getIO().emit('nueva_reserva', nuevaReserva)

    res.status(201).json(nuevaReserva)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la reserva', error })
  }
}

export const obtenerReservas = async (req: Request, res: Response) => {
  try {
    const reservas = await Reserva.find()
      .populate('mesa', 'numero ubicacion')
      .populate('usuario', 'nombre apellido')
    res.status(200).json(reservas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las reservas', error })
  }
}