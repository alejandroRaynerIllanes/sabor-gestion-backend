import { Request, Response } from 'express'
import Plato from '../models/Plato'

export const crearPlato = async (req: Request, res: Response) => {
  try {
    const nuevoPlato = new Plato(req.body)
    await nuevoPlato.save()
    res.status(201).json(nuevoPlato)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el plato', error })
  }
}

export const obtenerPlatos = async (req: Request, res: Response) => {
  try {
    // El populate trae la información de la categoría ligada a este plato
    const platos = await Plato.find().populate('categoria', 'nombre')
    res.status(200).json(platos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los platos', error })
  }
}