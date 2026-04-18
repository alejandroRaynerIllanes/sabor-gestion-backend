import { Request, Response } from 'express'
import Usuario from '../models/Usuario'
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
    const { nombre, email, password, rol } = req.body

    const usuarioExistente = await Usuario.findOne({ email })

    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
    }

    // 2. Crear la instancia del nuevo usuario. El hash ocurre en el pre-save del modelo.
    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password,
      rol
    })

    // 3. Guardar en MongoDB
    await nuevoUsuario.save()

    // 4. Responder al frontend confirmando la creación (sin enviar el password de vuelta)
    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol
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
    const { nombre, email, password, rol } = req.body

    // Buscar al usuario por ID
    let usuario = await Usuario.findById(id)
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    if (email !== usuario.email) {
      const usuarioExistente = await Usuario.findOne({
        email,
        _id: { $ne: usuario._id }
      })

      if (usuarioExistente) {
        return res.status(400).json({ mensaje: 'El correo ya está en uso por otro usuario' })
      }
    }

    usuario.nombre = nombre
    usuario.email = email
    usuario.rol = rol

    // Solo actualizamos la contraseña si el frontend nos envió una nueva.
    // El pre-save del modelo se encargará de encriptarla.
    if (password && password.trim() !== '') {
      usuario.password = password
    }

    await usuario.save()

    const usuarioActualizado = await Usuario.findById(id).select('-password')

    res.status(200).json({ mensaje: 'Usuario actualizado', usuario: usuarioActualizado })
  } catch (error) {
    console.error('Error al actualizar:', error)
    res.status(500).json({ mensaje: 'Error al actualizar el usuario' })
  }
}

// 4. Cambiar Estado (El Switch Activo/Inactivo)
export const cambiarEstadoUsuario = async (req: Request, res: Response): Promise<any> => {
  return res.status(501).json({
    mensaje:
      'La desactivación de usuarios requiere el campo estado y no forma parte de este esquema base.'
  })
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
