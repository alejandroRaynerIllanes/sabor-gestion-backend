//src/controllers/mesa.controller.ts
import { Request, Response } from 'express'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'
import mongoose from 'mongoose'

// Mapeos de estados para compatibilidad con el Frontend
const estadoBackendToFrontend = (estado: string | undefined) => {
  if (!estado) return 'Disponible'
  if (estado === 'Libre') return 'Disponible'
  if (estado === 'Cuenta Solicitada') return 'Esperando pago'
  return estado
}

const estadoFrontendToBackend = (status: string | undefined) => {
  if (!status) return undefined
  if (status === 'Disponible') return 'Libre'
  if (status === 'Esperando pago') return 'Cuenta Solicitada'
  return status
}

/**
 * HELPER DE MAPEO ULTRA-COMPATIBLE
 * Soluciona el problema de visibilidad asegurando que el ID sea string
 * y que la ubicación siempre tenga un valor coherente.
 */
const mapMesa = (m: any) => {
  if (!m) return null

  // 1. Extraer el nombre de la ubicación (prioridad a la relación poblada)
  let locationName = ''
  if (m.ubicacionId && typeof m.ubicacionId === 'object') {
    locationName = m.ubicacionId.nombre || m.ubicacionId.name || ''
  }

  // 2. Si no hay relación, usar el campo de texto legacy
  if (!locationName) {
    locationName = m.ubicacion || ''
  }

  return {
    // IMPORTANTE: Convertimos a string para solucionar el Warning de las "keys"
    id: m._id.toString(),
    _id: m._id.toString(),

    // Mapeo de propiedades para el Frontend
    name: m.numero || '',
    numero: m.numero || '', // Enviamos ambos por si el front usa uno u otro
    capacity: m.capacidad ?? 0,

    // La ubicación es crítica para el filtro de pestañas del front
    location: locationName,
    locationId: m.ubicacionId?._id?.toString() || m.ubicacionId?.toString() || null,

    status: estadoBackendToFrontend(m.estado),
    type: m.tipo || 'normal',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }
}

export const crearMesa = async (req: Request, res: Response) => {
  try {
    const body = req.body
    if (Array.isArray(body)) {
      const input = body.map((p: any) => {
        const base: any = {
          numero: p.name || p.numero,
          capacidad: p.capacity || p.capacidad,
          estado: estadoFrontendToBackend(p.status || p.estado) || 'Libre',
          tipo: p.type || p.tipo || 'normal'
        }
        const loc = p.location || p.ubicacion
        if (loc && mongoose.Types.ObjectId.isValid(String(loc))) base.ubicacionId = loc
        else base.ubicacion = loc
        return base
      })

      const nuevasMesas = await Mesa.insertMany(input)
      const pobladas = await Mesa.find({
        _id: { $in: nuevasMesas.map((m: any) => m._id) }
      }).populate('ubicacionId', 'nombre')
      const mapped = pobladas.map(mapMesa)

      try {
        getIO().emit('mesas:created', mapped)
      } catch (e) {
        console.warn('Socket error', e)
      }
      return res.status(201).json(mapped)
    }

    const mesaData: any = {
      numero: body.name || body.numero,
      capacidad: body.capacity || body.capacidad,
      estado: estadoFrontendToBackend(body.status || body.estado) || 'Libre',
      tipo: body.type || body.tipo || 'normal'
    }

    const loc = body.location || body.ubicacion
    if (loc !== undefined) {
      if (mongoose.Types.ObjectId.isValid(String(loc))) mesaData.ubicacionId = loc
      else mesaData.ubicacion = loc
    }

    const nuevaMesa = new Mesa(mesaData)
    await nuevaMesa.save()
    const nuevaMesaPoblada = await Mesa.findById(nuevaMesa._id).populate('ubicacionId', 'nombre')
    const mapped = mapMesa(nuevaMesaPoblada)

    try {
      getIO().emit('mesas:created', mapped)
    } catch (e) {}
    res.status(201).json(mapped)
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al crear la mesa', error: error.message || error })
  }
}

export const obtenerMesas = async (req: Request, res: Response) => {
  try {
    const { location } = req.query
    let filtro: any = {}

    if (location) {
      if (mongoose.Types.ObjectId.isValid(String(location))) filtro = { ubicacionId: location }
      else filtro = { ubicacion: location }
    }

    const mesas = await Mesa.find(filtro).populate('ubicacionId', 'nombre')
    res.status(200).json(mesas.map(mapMesa))
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al obtener las mesas', error: error.message || error })
  }
}

export const obtenerMesaPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const mesa = await Mesa.findById(id).populate('ubicacionId', 'nombre')
    if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    res.status(200).json(mapMesa(mesa))
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al obtener la mesa', error: error.message || error })
  }
}

export const actualizarMesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    const update: any = {}

    if (body.name !== undefined) update.numero = body.name
    if (body.capacity !== undefined) update.capacidad = body.capacity

    const loc = body.location || body.ubicacion
    if (loc !== undefined) {
      if (mongoose.Types.ObjectId.isValid(String(loc))) {
        update.ubicacionId = loc
        update.ubicacion = undefined
      } else {
        update.ubicacion = loc
        update.ubicacionId = null
      }
    }

    if (body.status !== undefined) update.estado = estadoFrontendToBackend(body.status)
    if (body.type !== undefined) update.tipo = body.type

    const mesaActualizada = await Mesa.findByIdAndUpdate(id, update, { new: true }).populate(
      'ubicacionId',
      'nombre'
    )
    if (!mesaActualizada) return res.status(404).json({ mensaje: 'Mesa no encontrada' })

    const mapped = mapMesa(mesaActualizada)
    try {
      getIO().emit('mesas:updated', mapped)
    } catch (e) {}
    res.status(200).json(mapped)
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al actualizar la mesa', error: error.message || error })
  }
}

export const actualizarEstadoMesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { estado } = req.body
    const backendStatus = estadoFrontendToBackend(estado) || estado

    const mesaActualizada = await Mesa.findByIdAndUpdate(
      id,
      { estado: backendStatus },
      { new: true }
    ).populate('ubicacionId', 'nombre')
    if (!mesaActualizada) return res.status(404).json({ mensaje: 'Mesa no encontrada' })

    const mapped = mapMesa(mesaActualizada)
    try {
      getIO().emit('mesas:updated', mapped)
    } catch (e) {}
    res.status(200).json(mapped)
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al actualizar estado', error: error.message || error })
  }
}

export const eliminarMesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const eliminado = await Mesa.findByIdAndDelete(id)
    if (!eliminado) return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    const mapped = mapMesa(eliminado)
    try {
      getIO().emit('mesas:deleted', mapped)
    } catch (e) {}
    res.status(200).json({ mensaje: 'Mesa eliminada', mesa: mapped })
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al eliminar mesa', error: error.message || error })
  }
}
