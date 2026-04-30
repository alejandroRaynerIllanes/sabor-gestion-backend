//src/controllers/plato.controller.ts
import { Request, Response } from 'express'
import Plato from '../models/Plato.js'
import { cloudinary } from '../configs/cloudinary.js'
import { getIO } from '../socket/socket.js'

// POST /api/platos
export const crearPlato = async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, precio, imagenUrl, imagenPublicId, categoria } = req.body

    if (!imagenUrl || !imagenPublicId) {
      res
        .status(400)
        .json({ mensaje: 'Se requiere subir una imagen primero usando POST /api/upload' })
      return
    }

    const nuevoPlato = new Plato({
      nombre,
      descripcion,
      precio,
      imagenUrl,
      imagenPublicId,
      categoria
    })

    await nuevoPlato.save()

    try {
      const io = getIO()
      io.emit('platos:created', nuevoPlato)
    } catch (err) {
      console.warn('Socket.io no inicializado — omitiendo emisión de platos:created')
    }

    res.status(201).json(nuevoPlato)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear el plato', error })
  }
}

// GET /api/platos
export const obtenerPlatos = async (req: Request, res: Response) => {
  try {
    const { category } = req.query
    let filtro = {}

    if (category) {
      filtro = { categoria: category }
    }

    const platos = await Plato.find(filtro).populate('categoria', 'nombre')
    res.status(200).json(platos)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener los platos', error })
  }
}

// GET /api/platos/:id
export const obtenerPlatoPorId = async (req: Request, res: Response) => {
  try {
    const plato = await Plato.findById(req.params.id).populate('categoria', 'nombre')
    if (!plato) {
      res.status(404).json({ mensaje: 'Plato no encontrado' })
      return
    }
    res.status(200).json(plato)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el plato', error })
  }
}

// PUT /api/platos/:id
export const actualizarPlato = async (req: Request, res: Response) => {
  try {
    const plato = await Plato.findById(req.params.id)
    if (!plato) {
      res.status(404).json({ mensaje: 'Plato no encontrado' })
      return
    }

    const { imagenUrl, imagenPublicId, ...resto } = req.body

    // Si viene imagen nueva, eliminar la anterior de Cloudinary
    if (imagenPublicId && imagenPublicId !== plato.imagenPublicId && plato.imagenPublicId) {
      await cloudinary.uploader.destroy(plato.imagenPublicId)
    }

    const platoActualizado = await Plato.findByIdAndUpdate(
      req.params.id,
      { ...resto, imagenUrl, imagenPublicId },
      { new: true, runValidators: true }
    )

    try {
      const io = getIO()
      io.emit('platos:updated', platoActualizado)
    } catch (err) {
      console.warn('Socket.io no inicializado — omitiendo emisión de platos:updated')
    }

    res.status(200).json(platoActualizado)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar el plato', error })
  }
}

// DELETE /api/platos/:id
export const eliminarPlato = async (req: Request, res: Response) => {
  try {
    const plato = await Plato.findById(req.params.id)
    if (!plato) {
      res.status(404).json({ mensaje: 'Plato no encontrado' })
      return
    }

    // Eliminar imagen de Cloudinary antes de borrar el plato
    if (plato.imagenPublicId) {
      await cloudinary.uploader.destroy(plato.imagenPublicId)
    }

    await plato.deleteOne()

    try {
      const io = getIO()
      io.emit('platos:deleted', { id: plato._id })
    } catch (err) {
      console.warn('Socket.io no inicializado — omitiendo emisión de platos:deleted')
    }

    res.status(200).json({ mensaje: 'Plato e imagen eliminados correctamente' })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el plato', error })
  }
}

// PATCH /api/platos/:id/disponibilidad
export const cambiarDisponibilidad = async (req: Request, res: Response) => {
  try {
    const plato = await Plato.findById(req.params.id)
    if (!plato) {
      res.status(404).json({ mensaje: 'Plato no encontrado' })
      return
    }

    plato.disponible = !plato.disponible
    await plato.save()

    try {
      const io = getIO()
      io.emit('platos:updated', plato)
    } catch (err) {
      console.warn('Socket.io no inicializado — omitiendo emisión de platos:updated (disponibilidad)')
    }

    res.status(200).json({
      mensaje: `Plato marcado como ${plato.disponible ? 'disponible' : 'agotado'}`,
      disponible: plato.disponible
    })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar disponibilidad', error })
  }
}
