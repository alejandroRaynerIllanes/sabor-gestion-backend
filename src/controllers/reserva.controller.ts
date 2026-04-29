import { Response } from 'express'
import mongoose from 'mongoose'
import Reserva from '../models/Reserva'
import Mesa from '../models/Mesa'
import { CustomRequest } from '../middlewares/auth.middleware'

export const crearReserva = async (req: CustomRequest, res: Response) => {
  try {
    const { mesa, tableId, date, fecha, time, hora, clientName, guestCount, vip } = req.body

    const mesaId = mesa || tableId
    const fechaReserva = date || fecha
    const horaReserva = time || hora
    const nombreCliente = clientName
    const cantidadPersonas = guestCount
    const usuarioId = req.usuario?.id

    if (!usuarioId) {
      return res.status(401).json({ mensaje: 'Usuario no autenticado.' })
    }

    if (!mesaId || !fechaReserva || !horaReserva || !nombreCliente || !cantidadPersonas) {
      return res.status(400).json({
        mensaje:
          'Faltan datos obligatorios: mesa/tableId, date/fecha, time/hora, clientName y guestCount.'
      })
    }

    if (!mongoose.Types.ObjectId.isValid(mesaId)) {
      return res.status(400).json({ mensaje: 'El id de la mesa no es válido.' })
    }

    const mesaEncontrada = await Mesa.findById(mesaId)
    if (!mesaEncontrada) {
      return res.status(404).json({ mensaje: 'La mesa no existe en la base de datos.' })
    }

    const reservaExistente = await Reserva.findOne({
      mesa: mesaId,
      fecha: new Date(fechaReserva),
      hora: horaReserva
    })

    if (reservaExistente) {
      return res.status(409).json({
        mensaje: 'Ya existe una reserva para esa mesa en esa fecha y hora.'
      })
    }

    const nuevaReserva = new Reserva({
      fecha: new Date(fechaReserva),
      hora: horaReserva,
      clienteNombre: nombreCliente,
      cantidadPersonas,
      vip: Boolean(vip),
      mesa: mesaId,
      usuario: usuarioId
    })

    await nuevaReserva.save()
    await Mesa.findByIdAndUpdate(mesaId, { estado: 'Reservada' })

    const reservaGuardada = await Reserva.findById(nuevaReserva._id)
      .populate('mesa', 'numero ubicacion capacidad estado')
      .populate('usuario', 'nombre apellido email rol')

    return res.status(201).json({
      id: reservaGuardada?._id,
      clientName: reservaGuardada?.clienteNombre,
      guestCount: reservaGuardada?.cantidadPersonas,
      date: reservaGuardada?.fecha,
      time: reservaGuardada?.hora,
      vip: reservaGuardada?.vip,
      mesa: reservaGuardada?.mesa,
      usuario: reservaGuardada?.usuario,
      createdAt: reservaGuardada?.createdAt
    })
  } catch (error) {
    console.error('Error al crear la reserva:', error)
    return res.status(500).json({ mensaje: 'Error al crear la reserva', error })
  }
}

export const obtenerReservas = async (req: CustomRequest, res: Response) => {
  try {
    const reservas = await Reserva.find()
      .populate('mesa', 'numero ubicacion capacidad estado')
      .populate('usuario', 'nombre apellido email rol')
      .sort({ createdAt: -1 })

    const reservasFormateadas = reservas.map((reserva) => ({
      id: reserva._id,
      clientName: reserva.clienteNombre,
      guestCount: reserva.cantidadPersonas,
      date: reserva.fecha,
      time: reserva.hora,
      vip: reserva.vip,
      mesa: reserva.mesa,
      usuario: reserva.usuario,
      createdAt: reserva.createdAt
    }))

    return res.status(200).json(reservasFormateadas)
  } catch (error) {
    console.error('Error al obtener las reservas:', error)
    return res.status(500).json({ mensaje: 'Error al obtener las reservas', error })
  }
}
