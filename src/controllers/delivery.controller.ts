import { Request, Response } from 'express';
import Pedido from '../models/Pedido';
import Usuario from '../models/Usuario';

// 1. Extendemos la interfaz Request de Express para que reconozca a 'user'
export interface AuthRequest extends Request {
  user?: any; // Si tienes una interfaz para tu Payload del JWT, puedes reemplazar 'any' por esa interfaz
}

// PUT /api/delivery/status
export const updateDeliveryStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { isAvailable } = req.body;
    // TypeScript ahora reconoce req.user. Usamos ? por si acaso y verificamos id o _id según tu token
    const repartidorId = req.user?.id || req.user?._id; 

    if (!repartidorId) {
      res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      return;
    }

    const repartidor = await Usuario.findByIdAndUpdate(
      repartidorId, 
      { isAvailable }, 
      { new: true }
    );

    res.status(200).json({ success: true, isAvailable: repartidor?.isAvailable });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando estado' });
  }
};

// GET /api/delivery/queue
export const getDeliveryQueue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const repartidorId = req.user?.id || req.user?._id;
    const MAX_PEDIDOS = 5;

    const pedidos = await Pedido.find({
      repartidorId,
      estado: { $in: ['Pendiente_de_Aceptacion', 'Repartidor_Esperando', 'En_Transito'] }
    });

    if (pedidos.length > MAX_PEDIDOS) {
      console.warn(`Repartidor ${repartidorId} superó el límite de pedidos activos.`);
    }

    res.status(200).json({ success: true, pedidos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error obteniendo cola de pedidos' });
  }
};

// PUT /api/delivery/orders/:id/state
export const updateOrderState = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    const estadosValidos = ['Pendiente_de_Aceptacion', 'En_Cocina', 'Repartidor_Esperando', 'En_Transito', 'Entregado'];
    if (!estadosValidos.includes(estado)) {
      res.status(400).json({ success: false, message: 'Estado inválido' });
      return;
    }

    const pedido = await Pedido.findByIdAndUpdate(id, { estado }, { new: true });
    
    res.status(200).json({ success: true, pedido });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error actualizando estado del pedido' });
  }
};