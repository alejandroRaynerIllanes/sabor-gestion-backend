// src/controllers/auth.controller.ts
import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { CodigoVerificacionService } from '../services/codigo-verificacion.service'
const codigoService = new CodigoVerificacionService()

export const loginUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body
    console.log(`\n🔑 [LOGIN] Intento de acceso con email: ${email}`)

    const usuarioEncontrado = await Usuario.findOne({ email })
    if (!usuarioEncontrado) {
      console.log(` [LOGIN] Falló: Usuario no encontrado en la BD.`)
      res.status(404).json({ mensaje: 'Usuario no encontrado en el sistema' })
      return
    }

    if (!usuarioEncontrado.estado) {
      res
        .status(403)
        .json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' })
      return
    }

    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password)
    if (!passwordValida) {
      console.log(` [LOGIN] Falló: Contraseña incorrecta para ${email}.`)
      res.status(401).json({ mensaje: 'Contraseña incorrecta' })
      return
    }

    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha logueado exitosamente.`)

    // Convertir el documento a objeto puro para poder leer campos fuera del esquema como 'ubicacion'
    const userObj: any =
      typeof usuarioEncontrado.toObject === 'function'
        ? usuarioEncontrado.toObject()
        : usuarioEncontrado

    const token = jwt.sign(
      {
        id: userObj._id,
        rol: userObj.rol,
        zona: userObj.ubicacion || userObj.zona || ''
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' }
    )

    res.status(200).json({
      mensaje: 'Bienvenido a Sabor & Gestión',
      token: token,
      usuario: {
        id: userObj._id,
        nombre: userObj.nombre,
        apellido: userObj.apellido,
        rol: userObj.rol,
        zona: userObj.ubicacion || userObj.zona || ''
      }
    })
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ mensaje: 'Error interno del servidor al intentar hacer login' })
  }
}

// Las funciones verificarCodigo y reenviarCodigo las dejamos intactas.
// Como ya nadie entra en ese flujo, simplemente no se usarán, pero no estorban.
export const verificarCodigo = async (req: Request, res: Response): Promise<void> => {
  /* ... código original ... */
}
export const reenviarCodigo = async (req: Request, res: Response): Promise<void> => {
  /* ... código original ... */
}
