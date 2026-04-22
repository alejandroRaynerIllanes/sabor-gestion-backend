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

router.post('/registro', registrarUsuario)
router.post('/verificar-codigo', verificarCodigo)
router.post('/reenviar-codigo', reenviarCodigo)

export default router