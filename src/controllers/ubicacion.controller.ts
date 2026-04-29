import { Request, Response } from 'express'
import Ubicacion from '../models/Ubicacion'

export const obtenerUbicaciones = async (req: Request, res: Response) => {
  try {
    const ubicaciones = await Ubicacion.find().sort({ nombre: 1 })
    res.status(200).json(ubicaciones.map(u => ({ id: u._id, nombre: u.nombre })))
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al obtener ubicaciones', error: error.message || error })
  }
}

export const crearUbicacion = async (req: Request, res: Response) => {
  try {
    const { nombre, name } = req.body
    const finalName = nombre || name
    if (!finalName) return res.status(400).json({ mensaje: 'Nombre de ubicación requerido' })

    // Evitar duplicados (case-insensitive)
    const existente = await Ubicacion.findOne({ nombre: { $regex: `^${finalName}$`, $options: 'i' } })
    if (existente) return res.status(400).json({ mensaje: 'Ubicación ya existe', ubicacion: { id: existente._id, nombre: existente.nombre } })

    const nueva = new Ubicacion({ nombre: finalName })
    await nueva.save()
    res.status(201).json({ id: nueva._id, nombre: nueva.nombre })
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al crear ubicacion', error: error.message || error })
  }
}
