import { Router } from 'express'
import {
  crearPlato,
  obtenerPlatos,
  obtenerPlatoPorId,
  actualizarPlato,
  eliminarPlato
} from '../controllers/plato.controller'
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

router.get('/', verificarToken, obtenerPlatos)
router.get('/:id', verificarToken, obtenerPlatoPorId)
router.post('/', verificarToken, soloAdmins, crearPlato)
router.put('/:id', verificarToken, soloAdmins, actualizarPlato)
router.delete('/:id', verificarToken, soloAdmins, eliminarPlato)

export default router
