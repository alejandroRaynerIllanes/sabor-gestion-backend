import { Router } from 'express'
import {
  loginUsuario,
  registrarUsuario,
  verificarCodigo,
  reenviarCodigo
} from '../controllers/auth.controller'

const router = Router()

router.post('/login', loginUsuario)
router.post('/register', registrarUsuario) // Mantenemos la de Jairo
router.post('/registro', registrarUsuario) // Mantenemos la tuya
router.post('/verificar-codigo', verificarCodigo)
router.post('/reenviar-codigo', reenviarCodigo)

router.post('/registro', registrarUsuario)
router.post('/verificar-codigo', verificarCodigo)
router.post('/reenviar-codigo', reenviarCodigo)

export default router
