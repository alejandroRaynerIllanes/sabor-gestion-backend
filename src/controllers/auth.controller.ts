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

    // 🛑 BLOQUE DESACTIVADO: Verificación de correo 🛑
    /*
    if (!usuarioEncontrado.verificado) {
      console.log(` [LOGIN] Bloqueado: ${email} no ha verificado su correo. Enviando código...`)
      try {
        await codigoService.procesarEnvioDeCodigo(
          usuarioEncontrado.email, usuarioEncontrado.nombre, usuarioEncontrado.apellido, usuarioEncontrado._id.toString()
        )
      } catch (error) { console.error('Error enviando email en login:', error) }

      res.status(403).json({
        mensaje: 'Debes verificar tu correo antes de ingresar. Te hemos enviado un nuevo código.',
        requiereVerificacion: true,
        usuarioId: usuarioEncontrado._id
      })
      return;
    }
    */

    console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha logueado exitosamente.`)

    const token = jwt.sign(
      { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol },
      process.env.JWT_SECRET as string,
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

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellido, ci, email, password } = req.body

    if (!nombre || !apellido || !ci || !email || !password) {
      res
        .status(400)
        .json({
          mensaje: 'Todos los campos son obligatorios: nombre, apellido, ci, email, password'
        })
      return
    }

    const usuarioExistente = await Usuario.findOne({
      $or: [{ email }, { ci }]
    })

    if (usuarioExistente) {
      if (usuarioExistente.email === email) {
        res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
        return
      }
      if (usuarioExistente.ci === ci) {
        res.status(400).json({ mensaje: 'El CI ya está registrado' })
        return
      }
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHasheada = await bcrypt.hash(password, salt)

    // ✅ CORRECCIÓN: Forzamos verificado a true desde el inicio
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      ci,
      email,
      password: passwordHasheada,
      rol: 'Cliente',
      estado: true,
      verificado: true // <-- ¡Aquí abrimos la puerta!
    })

    await nuevoUsuario.save()

    // 🛑 BLOQUE DESACTIVADO: Envío de email 🛑
    /*
    try {
      await codigoService.procesarEnvioDeCodigo(
        nuevoUsuario.email, nuevoUsuario.nombre, nuevoUsuario.apellido, nuevoUsuario._id.toString()
      )
    } catch (error) { console.error('Error enviando email:', error) }
    */

    res.status(201).json({
      mensaje: 'Registro exitoso. Ya puedes iniciar sesión.', // Mensaje actualizado
      requiereVerificacion: false, // <-- Lo ponemos en false para que el front no muestre modales raros
      usuarioId: nuevoUsuario._id
    })
  } catch (error) {
    console.error('Error en el registro:', error)
    res.status(500).json({ mensaje: 'Error interno al registrar usuario', error })
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
