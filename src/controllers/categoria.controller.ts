// src/controllers/categoria.controller.ts
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

// NUEVO: Editar Categoría
export const actualizarCategoria = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const categoriaActualizada = await Categoria.findByIdAndUpdate(id, req.body, { new: true })

    if (!categoriaActualizada) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' })
    }

    res.status(200).json(categoriaActualizada)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar la categoría', error })
  }
}

// NUEVO: Eliminar Categoría
export const eliminarCategoria = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const categoriaEliminada = await Categoria.findByIdAndDelete(id)

    if (!categoriaEliminada) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' })
    }

    res.status(200).json({ mensaje: 'Categoría eliminada correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar la categoría', error })
  }
}
