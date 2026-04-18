import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const loginUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body
    //LOG 1: Ver quién intenta entrar
    console.log(`\n🔑 [LOGIN] Intento de acceso con email: ${email}`)

    // 1. Buscar si el usuario existe por su email
    const usuarioEncontrado = await Usuario.findOne({ email })
    if (!usuarioEncontrado) {
      console.log(` [LOGIN] Falló: Usuario no encontrado en la BD.`)
      return res.status(404).json({ mensaje: 'Usuario no encontrado en el sistema' })
    }

    if (!usuarioEncontrado.activo) {
      console.log(` [LOGIN] Falló: Usuario desactivado.`)
      return res.status(403).json({ mensaje: 'La cuenta está desactivada.' })
    }

    // 2. Comparar la contraseña que ingresó con la encriptada en la base de datos
    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password)
    if (!passwordValida) {
      console.log(` [LOGIN] Falló: Contraseña incorrecta para ${email}.`)
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' })
    }
    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha iniciado sesión.`)

    // 3. Generar el Token JWT
    const token = jwt.sign(
      { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol },
      process.env.JWT_SECRET || 'secreto_temporal_de_desarrollo',
      { expiresIn: '8h' }
    )

    // 4. Devolver la respuesta al frontend
    res.status(200).json({
      mensaje: 'Bienvenido a Sabor & Gestión',
      token: token,
      usuario: {
        id: usuarioEncontrado._id,
        nombre: usuarioEncontrado.nombre,
        rol: usuarioEncontrado.rol
      }
    })
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ mensaje: 'Error interno del servidor al intentar hacer login' })
  }
}
