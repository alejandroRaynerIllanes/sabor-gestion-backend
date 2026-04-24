import { Router } from 'express';
import { obtenerUbicaciones, crearUbicacion, actualizarUbicacion, eliminarUbicacion } from '../controllers/ubicacion.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas están protegidas por el middleware verificarToken
router.get('/', verificarToken, obtenerUbicaciones);
router.post('/', verificarToken, crearUbicacion);
router.put('/:id', verificarToken, actualizarUbicacion);
router.delete('/:id', verificarToken, eliminarUbicacion);

export default router;