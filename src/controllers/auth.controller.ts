//src/controllers/auth.controller.ts
import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { CodigoVerificacionService } from '../services/codigo-verificacion.service'
const codigoService = new CodigoVerificacionService()

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

    // 2. Verificar si está activo (no dejamos entrar a usuarios inactivos)
    if (!usuarioEncontrado.estado) {
      return res
        .status(403)
        .json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' })
    }

    // 3. Comparar la contraseña que ingresó con la encriptada en la base de datos
    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password)
    if (!passwordValida) {
      console.log(` [LOGIN] Falló: Contraseña incorrecta para ${email}.`)
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' })
    }
    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha iniciado sesión.`)

    if (!usuarioEncontrado.verificado) {
      console.log(` [LOGIN] Bloqueado: ${email} no ha verificado su correo. Enviando código...`)
      
      await codigoService.procesarEnvioDeCodigo(
        usuarioEncontrado.email,
        usuarioEncontrado.nombre,
        usuarioEncontrado.apellido,
        usuarioEncontrado._id.toString()
      )

      return res.status(403).json({
        mensaje: 'Debes verificar tu correo antes de ingresar. Te hemos enviado un nuevo código.',
        requiereVerificacion: true,
        usuarioId: usuarioEncontrado._id
      })
    }

    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha iniciado sesión.`)

    // 4. Generar el Token JWT
    const token = jwt.sign(
      { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol },
      process.env.JWT_SECRET || 'secreto_temporal_de_desarrollo',
      { expiresIn: '8h' }
    )

    // 5. Devolver la respuesta al frontend
    res.status(200).json({
      mensaje: 'Bienvenido a Sabor & Gestión',
      token: token,
      usuario: {
        id: usuarioEncontrado._id,
        nombre: usuarioEncontrado.nombre,
        apellido: usuarioEncontrado.apellido,
        rol: usuarioEncontrado.rol
      }
    }) 
  } catch (error) {
    console.error('Error en el login:', error)
    res.status(500).json({ mensaje: 'Error interno del servidor al intentar hacer login' })
  }
}
  export const registrarUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, apellido, ci, email, password, rol } = req.body

    const existe = await Usuario.findOne({ email })
    if (existe) {
      return res.status(409).json({ mensaje: "El email ya está registrado" })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      ci,
      email,
      password: passwordHash,
      rol
    })
    
    await nuevoUsuario.save()

    // Enviar código inmediatamente tras el registro exitoso
    await codigoService.procesarEnvioDeCodigo(
      nuevoUsuario.email, 
      nuevoUsuario.nombre, 
      nuevoUsuario.apellido, 
      nuevoUsuario._id.toString()
    )

    return res.status(201).json({
      mensaje: "Registro exitoso. Se ha enviado un código a tu correo.",
      requiereVerificacion: true,
      usuarioId: nuevoUsuario._id
    })
  } catch (error) {
    console.error('Error en el registro:', error)
    return res.status(500).json({ mensaje: "Error interno al registrar usuario", error })
  }
}

export const verificarCodigo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuarioId, codigo } = req.body

    if (!usuarioId || !codigo) {
      return res.status(400).json({ mensaje: "Faltan datos requeridos (usuarioId o código)" })
    }

    const esValido = await codigoService.validarCodigoIngresado(codigo, usuarioId)
    
    if (!esValido) {
      return res.status(400).json({ mensaje: "Código inválido o ha expirado" })
    }

    // Actualizamos el usuario directamente usando Mongoose
    await Usuario.findByIdAndUpdate(usuarioId, { verificado: true })

    return res.status(200).json({ mensaje: "Correo verificado exitosamente. Ya puedes iniciar sesión." })
  } catch (error) {
    console.error('Error al verificar código:', error)
    return res.status(500).json({ mensaje: "Error interno al verificar el código", error })
  }
}

export const reenviarCodigo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuarioId } = req.body
    
    const usuario = await Usuario.findById(usuarioId)

    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" })
    }

    if (usuario.verificado) {
      return res.status(400).json({ mensaje: "Este usuario ya se encuentra verificado" })
    }

    await codigoService.procesarEnvioDeCodigo(
      usuario.email, 
      usuario.nombre, 
      usuario.apellido, 
      usuario._id.toString()
    )

    return res.status(200).json({ mensaje: "Un nuevo código ha sido enviado a tu correo" })
  } catch (error) {
    console.error('Error al reenviar código:', error)
    return res.status(500).json({ mensaje: "Error interno al reenviar el código", error })
  }
}
