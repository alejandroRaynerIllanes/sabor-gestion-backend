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

// 🔥 ESTA ES LA FUNCIÓN CLAVE QUE NECESITAMOS
export const obtenerPlatos = async (req: Request, res: Response) => {
  try {
    const platos = await Plato.find()
    res.status(200).json(platos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los platos', error })
  }
}

export const actualizarPlato = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const platoActualizado = await Plato.findByIdAndUpdate(id, req.body, { new: true });
    if (!platoActualizado) return res.status(404).json({ mensaje: 'Plato no encontrado' });
    res.status(200).json(platoActualizado);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar', error })
  }
}

export const eliminarPlato = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const platoEliminado = await Plato.findByIdAndDelete(id);
    if (!platoEliminado) return res.status(404).json({ mensaje: 'Plato no encontrado' });
    res.status(200).json({ mensaje: 'Plato eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar', error })
  }
}