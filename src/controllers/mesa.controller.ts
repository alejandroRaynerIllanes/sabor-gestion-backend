import { Request, Response } from 'express';
import Mesa from '../models/Mesa';

// 1. Obtener todas las mesas (Incluyendo los datos de su ubicación)
export const obtenerMesas = async (req: Request, res: Response): Promise<any> => {
  try {
    const mesas = await Mesa.find().populate('ubicacion');
    res.status(200).json(mesas);
  } catch (error) {
    console.error('Error al obtener mesas:', error);
    res.status(500).json({ mensaje: 'Error al obtener las mesas' });
  }
};

// 2. Crear una nueva mesa
export const crearMesa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { numero, capacidad, ubicacion, tipo, estado } = req.body;
    const nuevaMesa = new Mesa({ numero, capacidad, ubicacion, tipo, estado });
    await nuevaMesa.save();
    
    // Devolvemos la mesa creada pero con los datos de ubicación expandidos
    const mesaPoblada = await Mesa.findById(nuevaMesa._id).populate('ubicacion');
    res.status(201).json(mesaPoblada);
  } catch (error) {
    console.error('Error al crear mesa:', error);
    res.status(500).json({ mensaje: 'Error al crear la mesa' });
  }
};

// 3. Actualizar una mesa
export const actualizarMesa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const datosActualizar = req.body;
    
    const mesaActualizada = await Mesa.findByIdAndUpdate(id, datosActualizar, { new: true }).populate('ubicacion');
    if (!mesaActualizada) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
    
    res.status(200).json(mesaActualizada);
  } catch (error) {
    console.error('Error al actualizar mesa:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la mesa' });
  }
};

// 4. Eliminar una mesa
export const eliminarMesa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const mesaEliminada = await Mesa.findByIdAndDelete(id);
    if (!mesaEliminada) return res.status(404).json({ mensaje: 'Mesa no encontrada' });
    res.status(200).json({ mensaje: 'Mesa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar mesa:', error);
    res.status(500).json({ mensaje: 'Error al eliminar la mesa' });
  }
};