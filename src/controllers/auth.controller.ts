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

export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, apellido, ci, telefono, email, password } = req.body

    if (!nombre || !email || !password) {
      res.status(400).json({
        mensaje: 'Los campos obligatorios son: nombre, email, password'
      })
      return
    }

    const regexNombres = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/
    if (!regexNombres.test(nombre) || nombre.length > 30) {
      res
        .status(400)
        .json({ mensaje: 'El nombre solo debe contener letras y máximo 30 caracteres.' })
      return
    }
    if (apellido && (!regexNombres.test(apellido) || apellido.length > 30)) {
      res
        .status(400)
        .json({ mensaje: 'Los apellidos solo deben contener letras y máximo 30 caracteres.' })
      return
    }
    if (ci && (!/^\d+$/.test(ci) || ci.length > 8)) {
      res.status(400).json({ mensaje: 'El CI solo debe contener números y máximo 8 dígitos.' })
      return
    }
    if (telefono && (!/^[\d\s\+\-()]+$/.test(telefono) || telefono.length > 20)) {
      res.status(400).json({ mensaje: 'El Teléfono tiene un formato inválido.' })
      return
    }

    const usuarioExistente = await Usuario.findOne({
      $or: [{ email }, ...(ci ? [{ ci }] : [])]
    })

    if (usuarioExistente) {
      if (usuarioExistente.email === email) {
        res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
        return
      }
      if (ci && usuarioExistente.ci === ci) {
        res.status(400).json({ mensaje: 'El CI ya está registrado' })
        return
      }
    }

    const salt = await bcrypt.genSalt(10)
    const passwordHasheada = await bcrypt.hash(password, salt)

    // FIX: Para clientes públicos, asignamos valores por defecto seguros para que la BD no falle
    const apellidoFinal = apellido && apellido.trim() !== '' ? apellido : 'Sin Apellido'
    const ciFinal = ci && ci.trim() !== '' ? ci : `CLI-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 100)}`

    // ✅ CORRECCIÓN: Forzamos verificado a true desde el inicio
    const nuevoUsuario = new Usuario({
      nombre,
      apellido: apellidoFinal,
      ci: ciFinal,
      telefono: telefono || '',
      email,
      password: passwordHasheada,
      rol: 'Cliente',
      estado: true,
      verificado: true // <-- ¡Aquí abrimos la puerta!
    })

    await nuevoUsuario.save()

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
