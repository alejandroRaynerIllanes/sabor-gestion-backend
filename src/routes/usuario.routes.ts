import { Router } from 'express'
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  obtenerUsuarios
} from '../controllers/usuario.controller'
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

// Para ver los usuarios: Debe tener sesión iniciada (verificarToken)
router.get('/', verificarToken, obtenerUsuarios)

// Para crear usuario: Debe tener sesión iniciada Y además ser Administrador
router.post('/', verificarToken, soloAdmins, crearUsuario)

// Para editar usuario: Debe tener sesión iniciada Y además ser Administrador
router.put('/:id', verificarToken, soloAdmins, actualizarUsuario)

// Para desactivar usuario (soft delete): Debe tener sesión iniciada Y además ser Administrador
router.patch('/:id/desactivar', verificarToken, soloAdmins, cambiarEstadoUsuario)

export default router
