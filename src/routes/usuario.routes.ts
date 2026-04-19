//src/routes/usuario.routes.ts
import { Router } from 'express';
import { obtenerUsuarios, crearUsuario } from '../controllers/usuario.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { soloAdmins } from '../middlewares/rol.middleware';

const router = Router()

// Para ver los usuarios: Debe tener sesión iniciada (verificarToken)
router.get('/', verificarToken, obtenerUsuarios)

// Para crear usuario: Debe tener sesión iniciada Y además ser Administrador
router.post('/', verificarToken, soloAdmins, crearUsuario)

export default router
