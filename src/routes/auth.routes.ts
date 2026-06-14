//src/routes/auth.routes.ts
import { Router } from 'express'
import {
  loginUsuario,
  registrarUsuario,
  verificarCodigo,
  reenviarCodigo
} from '../controllers/auth.controller'

const router = Router()

router.post('/login', loginUsuario)
router.post('/register', registrarUsuario) // Mantenemos la de Jairo por compatibilidad
router.post('/registro', registrarUsuario) // <-- Ruta correcta que consume el nuevo Frontend
router.post('/verificar-codigo', verificarCodigo)
router.post('/reenviar-codigo', reenviarCodigo)

export default router
