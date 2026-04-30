import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { CodigoVerificacionService } from '../services/codigo-verificacion.service'
const codigoService = new CodigoVerificacionService()

export const loginUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body
    console.log(`\n🔑 [LOGIN] Intento de acceso con email: ${email}`)

    const usuarioEncontrado = await Usuario.findOne({ email })
    if (!usuarioEncontrado) {
      console.log(` [LOGIN] Falló: Usuario no encontrado en la BD.`)
      return res.status(404).json({ mensaje: 'Usuario no encontrado en el sistema' })
    }

    if (!usuarioEncontrado.estado) {
      return res
        .status(403)
        .json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' })
    }

    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password)
    if (!passwordValida) {
      console.log(` [LOGIN] Falló: Contraseña incorrecta para ${email}.`)
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' })
    }

    if (!usuarioEncontrado.verificado) {
      console.log(` [LOGIN] Bloqueado: ${email} no ha verificado su correo. Enviando código...`)
      
      try {
        await codigoService.procesarEnvioDeCodigo(
          usuarioEncontrado.email,
          usuarioEncontrado.nombre,
          usuarioEncontrado.apellido,
          usuarioEncontrado._id.toString()
        )
      } catch (error) {
        console.error('Error enviando email en login:', error)
      }

      return res.status(403).json({
        mensaje: 'Debes verificar tu correo antes de ingresar. Te hemos enviado un nuevo código.',
        requiereVerificacion: true,
        usuarioId: usuarioEncontrado._id
      })
    }

    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha verificado y logueado.`)

    const token = jwt.sign(
      { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol },
      process.env.JWT_SECRET || 'secreto_temporal_de_desarrollo',
      { expiresIn: '8h' }
    )

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
    const { nombre, apellido, ci, email, password } = req.body

    // Validaciones aportadas por la rama de Jairo
    if (!nombre || !apellido || !ci || !email || !password) {
      return res.status(400).json({
        mensaje: 'Todos los campos son obligatorios: nombre, apellido, ci, email, password'
      })
    }

    const usuarioExistente = await Usuario.findOne({
      $or: [{ email }, { ci }]
    })

    if (usuarioExistente) {
      if (usuarioExistente.email === email) {
        return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
      }

      if (usuarioExistente.ci === ci) {
        return res.status(400).json({ mensaje: 'El CI ya está registrado' })
      }
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHasheada = await bcrypt.hash(password, salt)

    // REGISTRO FINAL CORRECTO (Incluye rol, estado y verificado)
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      ci,
      email,
      password: passwordHasheada,
      rol: 'Cliente',
      estado: true,
      verificado: false
    })

    await nuevoUsuario.save()

    // TERCER ERROR CORREGIDO: Envío de email con try/catch
    try {
      await codigoService.procesarEnvioDeCodigo(
        nuevoUsuario.email,
        nuevoUsuario.nombre,
        nuevoUsuario.apellido,
        nuevoUsuario._id.toString()
      )
    } catch (error) {
      console.error('Error enviando email:', error)
    }

    return res.status(201).json({
      mensaje: 'Registro exitoso. Se ha enviado un código a tu correo.',
      requiereVerificacion: true,
      usuarioId: nuevoUsuario._id
    })
  } catch (error) {
    console.error('Error en el registro:', error)
    return res.status(500).json({ mensaje: 'Error interno al registrar usuario', error })
  }
}

export const verificarCodigo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuarioId, codigo } = req.body

    if (!usuarioId || !codigo) {
      return res.status(400).json({ mensaje: 'Faltan datos requeridos (usuarioId o código)' })
    }

    const esValido = await codigoService.validarCodigoIngresado(codigo, usuarioId)

    if (!esValido) {
      return res.status(400).json({ mensaje: 'Código inválido o ha expirado' })
    }

    await Usuario.findByIdAndUpdate(usuarioId, { verificado: true })

    return res
      .status(200)
      .json({ mensaje: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' })
  } catch (error) {
    console.error('Error al verificar código:', error)
    return res.status(500).json({ mensaje: 'Error interno al verificar el código', error })
  }
}

export const reenviarCodigo = async (req: Request, res: Response): Promise<any> => {
  try {
    const { usuarioId } = req.body

    const usuario = await Usuario.findById(usuarioId)

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    if (usuario.verificado) {
      return res.status(400).json({ mensaje: 'Este usuario ya se encuentra verificado' })
    }

    // Aplicado el try/catch aquí también por seguridad
    try {
      await codigoService.procesarEnvioDeCodigo(
        usuario.email,
        usuario.nombre,
        usuario.apellido,
        usuario._id.toString()
      )
    } catch (error) {
      console.error('Error reenviando email:', error)
    }

    return res.status(200).json({ mensaje: 'Un nuevo código ha sido enviado a tu correo' })
  } catch (error) {
    console.error('Error al reenviar código:', error)
    return res.status(500).json({ mensaje: 'Error interno al reenviar el código', error })
  }
}