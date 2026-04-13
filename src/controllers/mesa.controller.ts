import { Request, Response } from 'express'
import Mesa from '../models/Mesa'

export const crearMesa = async (req: Request, res: Response) => {
  try {
    const nuevaMesa = new Mesa(req.body)
    await nuevaMesa.save()
    res.status(201).json(nuevaMesa)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la mesa', error })
  }
}

export const obtenerMesas = async (req: Request, res: Response) => {
  try {
    const mesas = await Mesa.find()
    res.status(200).json(mesas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las mesas', error })
  }
}