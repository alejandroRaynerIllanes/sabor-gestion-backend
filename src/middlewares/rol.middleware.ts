// src/middlewares/rol.middleware.ts
import { Response, NextFunction } from 'express'
import { CustomRequest } from './auth.middleware'

export const permitirRoles = (...rolesPermitidos: string[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction): any => {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'Acceso denegado. Usuario no autenticado.'
      })
    }

    // 1. TOLERANCIA DE PROPIEDAD: Lee tanto 'rol' como 'role' por si develop cambió el idioma
    const rolUsuario = req.usuario.rol || (req.usuario as any).role

    if (!rolUsuario) {
      return res.status(403).json({
        mensaje: 'Acceso denegado. El usuario no contiene un rol válido en el token.'
      })
    }

    // 2. TOLERANCIA DE CASING: Pasamos todo a minúsculas para que 'repartidor' coincida con 'Repartidor'
    const rolUsuarioMinuscula = String(rolUsuario).toLowerCase()
    const rolesPermitidosMinuscula = rolesPermitidos.map(r => String(r).toLowerCase())

    const tienePermiso = rolesPermitidosMinuscula.includes(rolUsuarioMinuscula)

    if (!tienePermiso) {
      return res.status(403).json({
        mensaje: 'Acceso denegado. No tienes permisos para realizar esta acción.'
      })
    }

    next()
  }
}

export const soloAdmins = permitirRoles('Administrador')