import { Request, Response } from 'express'
import Usuario from '../models/Usuario'

export const obtenerUsuarios = async (req: Request, res: Response) => {
  try {
    const usuarios = await Usuario.find().select('-password')
    res.status(200).json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    res.status(500).json({ mensaje: 'Error al obtener los usuarios' })
  }
}

export const crearUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { nombre, email, password, rol } = req.body

    const usuarioExistente = await Usuario.findOne({ email })

    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado' })
    }

    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password,
      rol
    })

    await nuevoUsuario.save()

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        activo: nuevoUsuario.activo
      }
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    res.status(500).json({ mensaje: 'Error al crear el usuario en el servidor' })
  }
}

export const actualizarUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const { nombre, email, password, rol } = req.body

    const usuario = await Usuario.findById(id)
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

export const cambiarEstadoUsuario = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    ).select('-password')

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' })
    }

    res.status(200).json({
      mensaje: 'Usuario desactivado correctamente',
      usuario: usuarioActualizado
    })
  } catch (error) {
    console.error('Error al desactivar usuario:', error)
    res.status(500).json({ mensaje: 'Error al desactivar el usuario' })
  }
}

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
