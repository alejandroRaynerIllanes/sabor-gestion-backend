import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
// Listar todos los usuarios (Para tu tabla principal)
export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    // Excluimos la contraseña para que nunca viaje al frontend por seguridad
    const usuarios = await Usuario.find().select('-password')
    res.status(200).json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ mensaje: 'Error al obtener los usuarios' })
  }
}

// Crear un nuevo usuario (Desde el modal del administrador)
export const crearUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, apellido, ci, email, password, rol } = req.body

    // 1. Validación dual: Verificamos si el CI o el Email ya existen
    const usuarioExistente = await Usuario.findOne({
      $or: [{ email: email }, { ci: ci }]
    })

    if (usuarioExistente) {
      if (usuarioExistente.ci === ci) {
        return res
          .status(400)
          .json({ mensaje: 'Ya existe un usuario registrado con este Carnet de Identidad' })
      }
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
    }

    // 2. Encriptar la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10)
    const passwordHasheada = await bcrypt.hash(password, salt)

    // 3. Crear la instancia del nuevo usuario
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      ci,
      email,
      password: passwordHasheada,
      rol
      // El 'estado: true' se pone automáticamente por el modelo
    })

    // 4. Guardar en MongoDB
    await nuevoUsuario.save()

    // 5. Responder al frontend confirmando la creación (sin enviar el password de vuelta)
    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        ci: nuevoUsuario.ci,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado
      }
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ mensaje: 'Error al crear el usuario en el servidor' })
  }
}

// --- AÑADE ESTO AL FINAL DE TU ARCHIVO usuario.controller.ts ---

// 3. Actualizar Usuario (Modal Editar)
export const actualizarUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const { nombre, apellido, ci, email, password, rol } = req.body

    // Buscar al usuario por ID
    let usuario = await Usuario.findById(id)
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    // Si el admin mandó un CI o Email diferente, verificar que no choque con otro usuario
    if (email !== usuario.email || ci !== usuario.ci) {
      const usuarioExistente = await Usuario.findOne({
        $or: [{ email: email }, { ci: ci }],
        _id: { $ne: new mongoose.Types.ObjectId(id as string) } // <-- La corrección está aquí
      })

      if (usuarioExistente) {
        if (usuarioExistente.ci === ci)
          return res.status(400).json({ mensaje: 'El CI ya está en uso por otro usuario' })
        return res.status(400).json({ mensaje: 'El correo ya está en uso por otro usuario' })
      }
    }

    // Preparar los datos a actualizar
    const datosActualizados: any = { nombre, apellido, ci, email, rol }

    // TRUCO: Solo actualizamos la contraseña si el frontend nos envió una nueva
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10)
      datosActualizados.password = await bcrypt.hash(password, salt)
    }

    // Guardar cambios y devolver el usuario nuevo (new: true)
    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, datosActualizados, {
      new: true
    }).select('-password')

    res.status(200).json({ mensaje: 'Usuario actualizado', usuario: usuarioActualizado })
  } catch (error) {
    console.error('Error al actualizar:', error)
    res.status(500).json({ mensaje: 'Error al actualizar el usuario' })
  }
}

// 4. Cambiar Estado (El Switch Activo/Inactivo)
export const cambiarEstadoUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const { estado } = req.body // Recibimos true o false

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      { estado: estado },
      { new: true }
    ).select('-password')

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    res.status(200).json({
      mensaje: `Usuario marcado como ${estado ? 'Activo' : 'Inactivo'}`,
      usuario: usuarioActualizado
    })
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    res.status(500).json({ mensaje: 'Error al cambiar el estado del usuario' })
  }
}

// 5. Eliminar Usuario Físicamente (El ícono de papelera)
export const eliminarUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params

    const usuarioEliminado = await Usuario.findByIdAndDelete(id)

    if (!usuarioEliminado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    res.status(200).json({ mensaje: 'Usuario eliminado del sistema exitosamente' })
  } catch (error) {
    console.error('Error al eliminar:', error)
    res.status(500).json({ mensaje: 'Error al eliminar el usuario' })
  }
}
