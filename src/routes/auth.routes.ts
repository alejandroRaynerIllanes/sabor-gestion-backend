//src/routes/auth.routes.ts
import { Router } from 'express';
import { loginUsuario } from '../controllers/auth.controller';

const router = Router()

router.post('/login', loginUsuario)

export default router
