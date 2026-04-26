//src/routes/auth.routes.ts
import { Router } from 'express'
import { loginUsuario, registrarUsuario } from '../controllers/auth.controller'

const router = Router()

router.post('/login', loginUsuario)
router.post('/register', registrarUsuario)

export default router
