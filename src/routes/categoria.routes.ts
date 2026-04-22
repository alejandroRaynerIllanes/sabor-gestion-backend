// src/routes/categoria.routes.ts
import { Router } from 'express'
import {
  crearCategoria,
  obtenerCategorias,
  actualizarCategoria,
  eliminarCategoria
} from '../controllers/categoria.controller'

// Importamos tus middlewares de seguridad
import { verificarToken } from '../middlewares/auth.middleware'
import { soloAdmins } from '../middlewares/rol.middleware'

const router = Router()

// GET: Todos los usuarios con sesión iniciada pueden ver las categorías
router.get('/', verificarToken, obtenerCategorias)

// POST, PUT, DELETE: Solo el Administrador puede modificar las categorías
router.post('/', verificarToken, soloAdmins, crearCategoria)
router.put('/:id', verificarToken, soloAdmins, actualizarCategoria)
router.delete('/:id', verificarToken, soloAdmins, eliminarCategoria)

export default router
