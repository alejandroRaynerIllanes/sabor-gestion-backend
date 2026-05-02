import { Router } from 'express'
import { obtenerUbicaciones, crearUbicacion } from '../controllers/ubicacion.controller'
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

// Listar ubicaciones (cualquier usuario autenticado)
router.get('/', verificarToken, obtenerUbicaciones)

// Crear ubicacion (solo admin)
router.post('/', verificarToken, soloAdmins, crearUbicacion)

export default router
