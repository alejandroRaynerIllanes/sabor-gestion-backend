import { Response, NextFunction } from 'express'
import { CustomRequest } from './auth.middleware'

export const soloAdmins = (req: CustomRequest, res: Response, next: NextFunction): any => {
  // Verificamos el rol que sacamos del Token
  if (req.usuario && req.usuario.rol === 'Administrador') {
    next() // Es admin, lo dejamos pasar
  } else {
    return res
      .status(403)
      .json({ mensaje: 'Acceso denegado. Se requieren privilegios de Administrador.' })
  }
}
