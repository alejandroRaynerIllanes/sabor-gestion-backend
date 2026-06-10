import { Router } from 'express';
import { updateDeliveryStatus, getDeliveryQueue, updateOrderState } from '../controllers/delivery.controller';

import { verificarToken } from '../middlewares/auth.middleware'; 
import { permitirRoles } from '../middlewares/rol.middleware';   

const router = Router();

// Todas las rutas requieren ser repartidor autenticado
router.use(verificarToken);
// SOLUCIÓN: Sin corchetes, separados por coma
router.use(permitirRoles('repartidor', 'Delivery')); 

router.put('/status', updateDeliveryStatus);
router.get('/queue', getDeliveryQueue);
router.put('/orders/:id/state', updateOrderState);

export default router;