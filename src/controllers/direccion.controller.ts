import { Response } from 'express';
import Usuario from '../models/Usuario';
import { CustomRequest } from '../middlewares/auth.middleware';

export const agregarDireccionEntrega = async (req: CustomRequest, res: Response): Promise<any> => {
  try {
    const { lat, lng, etiqueta } = req.body;

    // Validación técnica estricta de coordenadas
    if (!lat || !lng || lat === 0 || lng === 0) {
      return res.status(400).json({ 
        success: false, 
        mensaje: 'Las coordenadas no pueden ser nulas o cero. La geolocalización es obligatoria.' 
      });
    }

    const clienteId = req.usuario?.id || req.usuario?.id;

    // Insertar la nueva dirección directamente en el arreglo del usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      clienteId,
      { 
        $push: { 
          direccionesDelivery: { 
            etiqueta: (etiqueta || 'Dirección de Entrega').toString().trim(), 
            lat, 
            lng 
          } 
        } 
      },
      { new: true }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
    }

    return res.status(201).json({ 
      success: true, 
      mensaje: 'Dirección añadida exitosamente al perfil', 
      direcciones: usuarioActualizado.direccionesDelivery 
    });

  } catch (error: any) {
    console.error('agregarDireccionEntrega error:', error);
    return res.status(500).json({ 
      success: false, 
      mensaje: 'Error en el servidor al actualizar las direcciones', 
      error: error.message || error 
    });
  }
};