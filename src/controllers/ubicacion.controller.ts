import { Request, Response } from 'express';
import Ubicacion from '../models/Ubicacion';
import Mesa from '../models/Mesa'; // Lo importamos para validar antes de eliminar

// 1. Obtener todas las ubicaciones
export const obtenerUbicaciones = async (req: Request, res: Response): Promise<any> => {
  try {
    const ubicaciones = await Ubicacion.find();
    res.status(200).json(ubicaciones);
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    res.status(500).json({ mensaje: 'Error al obtener las ubicaciones' });
  }
};

// 2. Crear una nueva ubicación
export const crearUbicacion = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre } = req.body;
    const nuevaUbicacion = new Ubicacion({ nombre });
    await nuevaUbicacion.save();
    res.status(201).json(nuevaUbicacion);
  } catch (error) {
    console.error('Error al crear ubicación:', error);
    res.status(500).json({ mensaje: 'Error al crear la ubicación' });
  }
};

// 3. Actualizar una ubicación
export const actualizarUbicacion = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    const ubicacionActualizada = await Ubicacion.findByIdAndUpdate(
      id,
      { nombre },
      { new: true }
    );
    if (!ubicacionActualizada) return res.status(404).json({ mensaje: 'Ubicación no encontrada' });
    res.status(200).json(ubicacionActualizada);
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la ubicación' });
  }
};

// 4. Eliminar una ubicación (Con protección si tiene mesas)
export const eliminarUbicacion = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    
    // Seguro: Verificar si hay mesas usando esta ubicación
    const mesasAsociadas = await Mesa.findOne({ ubicacion: id });
    if (mesasAsociadas) {
      return res.status(400).json({ mensaje: 'No puedes eliminar esta ubicación porque tiene mesas asignadas.' });
    }

    await Ubicacion.findByIdAndDelete(id);
    res.status(200).json({ mensaje: 'Ubicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar ubicación:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la ubicación' });
  }
};