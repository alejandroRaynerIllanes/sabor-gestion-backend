import { Request, Response } from 'express'
import Categoria from '../models/Categoria'

export const crearCategoria = async (req: Request, res: Response) => {
  try {
    const nuevaCategoria = new Categoria(req.body)
    await nuevaCategoria.save()
    res.status(201).json(nuevaCategoria)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la categoría', error })
  }
}

export const obtenerCategorias = async (req: Request, res: Response) => {
  try {
    const categorias = await Categoria.find()
    res.status(200).json(categorias)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las categorías', error })
  }
}
