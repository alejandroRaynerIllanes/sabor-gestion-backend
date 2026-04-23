// src/routes/usuario.routes.ts
import { Router } from 'express'
import {
  obtenerUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  eliminarUsuario
} from '../controllers/usuario.controller'
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

// GET: Para ver los usuarios (Debe tener sesión iniciada)
router.get('/', verificarToken, obtenerUsuarios)

// POST: Para crear usuario (Debe ser Administrador)
router.post('/', verificarToken, soloAdmins, crearUsuario)

// PUT: Para editar un usuario completo (Debe ser Administrador)
router.put('/:id', verificarToken, soloAdmins, actualizarUsuario)

// PATCH: Para cambiar solo el estado Activo/Inactivo (Debe ser Administrador)
router.patch('/:id/estado', verificarToken, soloAdmins, cambiarEstadoUsuario)

// DELETE: Para eliminar un usuario (Debe ser Administrador)
router.delete('/:id', verificarToken, soloAdmins, eliminarUsuario)

export default router
