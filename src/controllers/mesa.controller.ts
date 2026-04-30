import { Request, Response } from 'express'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'
import mongoose from 'mongoose'

// Mapeos entre estados DB <-> frontend
const estadoBackendToFrontend = (estado: string | undefined) => {
  if (!estado) return 'Disponible'
  if (estado === 'Libre') return 'Disponible'
  if (estado === 'Cuenta Solicitada') return 'Esperando pago'
  return estado // 'Ocupada', 'Reservada'
}

const estadoFrontendToBackend = (status: string | undefined) => {
  if (!status) return undefined
  if (status === 'Disponible') return 'Libre'
  if (status === 'Esperando pago') return 'Cuenta Solicitada'
  return status // 'Ocupada', 'Reservada'
}

// Helper: mapear documento de Mongo a formato esperado por el frontend
const mapMesa = (m: any) => {
  if (!m) return null

  // Preferir `ubicacionId` poblada cuando exista, si no usar la cadena `ubicacion`
  const locationName =
    m.ubicacionId && (m.ubicacionId.nombre || m.ubicacionId.name)
      ? m.ubicacionId.nombre || m.ubicacionId.name
      : m.ubicacion || m.location || ''
  const locationId = m.ubicacionId ? m.ubicacionId._id || m.ubicacionId : null

  return {
    id: m._id,
    name: m.numero || m.name || '',
    capacity: m.capacidad ?? m.capacity ?? 0,
    location: locationName,
    locationId: locationId,
    status: estadoBackendToFrontend(m.estado || m.status),
    type: m.tipo || m.type || 'normal',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }
}

export const crearMesa = async (req: Request, res: Response) => {
  try {
    const body = req.body

    // Si mandas un array [{}], normalizamos y usamos insertMany
    if (Array.isArray(body)) {
      const input = body.map((p: any) => {
        const base: any = {
          numero: p.name || p.numero,
          capacidad: p.capacity || p.capacidad,
          estado: estadoFrontendToBackend(p.status || p.estado) || 'Libre',
          tipo: p.type || p.tipo || 'normal'
        }
        // Si mandan un id válido lo guardamos en ubicacionId, si mandan texto lo guardamos en ubicacion
        if (p.location && mongoose.Types.ObjectId.isValid(String(p.location)))
          base.ubicacionId = p.location
        else base.ubicacion = p.location || p.ubicacion
        return base
      })

      const nuevasMesas = await Mesa.insertMany(input)
      // volver a poblar para obtener nombres de ubicacion si existen
      const pobladas = await Mesa.find({
        _id: { $in: nuevasMesas.map((m: any) => m._id) }
      }).populate('ubicacionId', 'nombre')
      const mapped = pobladas.map(mapMesa)
      try {
        getIO().emit('mesas:created', mapped)
      } catch (e) {}
      return res.status(201).json(mapped)
    }

    const mesaData: any = {
      numero: body.name || body.numero,
      capacidad: body.capacity || body.capacidad,
      estado: estadoFrontendToBackend(body.status || body.estado) || 'Libre',
      tipo: body.type || body.tipo || 'normal'
    }

    if (body.location !== undefined) {
      if (mongoose.Types.ObjectId.isValid(String(body.location)))
        mesaData.ubicacionId = body.location
      else mesaData.ubicacion = body.location
    } else if (body.ubicacion !== undefined) {
      if (mongoose.Types.ObjectId.isValid(String(body.ubicacion)))
        mesaData.ubicacionId = body.ubicacion
      else mesaData.ubicacion = body.ubicacion
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
    const { location } = req.query // Extraemos el parámetro 'location' de la URL
    let filtro: any = {}

    // Si el usuario envía una ubicación, filtramos. Aceptamos id (ubicacionId) o nombre
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
    if (body.location !== undefined) {
      if (mongoose.Types.ObjectId.isValid(String(body.location))) update.ubicacionId = body.location
      else update.ubicacion = body.location
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
    const { estado } = req.body // El cliente manda el nuevo estado: 'Libre', 'Ocupada', etc.

    // Añadí el populate para que si el socket lo emite, mande los datos completos
    const mesaActualizada = await Mesa.findByIdAndUpdate(id, { estado }, { new: true }).populate(
      'ubicacionId',
      'nombre'
    )

    if (!mesaActualizada) {
      return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    }

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
