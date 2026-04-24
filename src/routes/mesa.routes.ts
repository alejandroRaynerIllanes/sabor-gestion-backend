import { Router } from 'express';
import { obtenerMesas, crearMesa, actualizarMesa, eliminarMesa } from '../controllers/mesa.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas están protegidas por el middleware verificarToken
router.get('/', verificarToken, obtenerMesas);
router.post('/', verificarToken, crearMesa);
router.put('/:id', verificarToken, actualizarMesa);
router.delete('/:id', verificarToken, eliminarMesa);

export default router;