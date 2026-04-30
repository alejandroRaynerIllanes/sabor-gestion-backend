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

router.get('/', verificarToken, obtenerUsuarios)
router.post('/', verificarToken, soloAdmins, crearUsuario)
router.put('/:id', verificarToken, soloAdmins, actualizarUsuario)
router.patch('/:id/estado', verificarToken, soloAdmins, cambiarEstadoUsuario)
router.delete('/:id', verificarToken, soloAdmins, eliminarUsuario)

export default router
