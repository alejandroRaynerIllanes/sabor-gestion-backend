import { Request, Response } from 'express'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket';

// Mapeos entre estados DB <-> frontend
const estadoBackendToFrontend = (estado: string | undefined) => {
  if (!estado) return 'Disponible';
  if (estado === 'Libre') return 'Disponible';
  if (estado === 'Cuenta Solicitada') return 'Esperando pago';
  return estado; // 'Ocupada', 'Reservada'
}

const estadoFrontendToBackend = (status: string | undefined) => {
  if (!status) return undefined;
  if (status === 'Disponible') return 'Libre';
  if (status === 'Esperando pago') return 'Cuenta Solicitada';
  return status; // 'Ocupada', 'Reservada'
}

// Helper: mapear documento de Mongo a formato esperado por el frontend
const mapMesa = (m: any) => {
  if (!m) return null;
  return {
    id: m._id,
    name: m.numero || m.name || '',
    capacity: m.capacidad ?? m.capacity ?? 0,
    location: m.ubicacion || m.location || '',
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
      const input = body.map((p: any) => ({
          numero: p.name || p.numero,
          capacidad: p.capacity || p.capacidad,
          ubicacion: p.location || p.ubicacion,
          estado: estadoFrontendToBackend(p.status || p.estado) || 'Libre',
          tipo: p.type || p.tipo || 'normal'
        }))

      const nuevasMesas = await Mesa.insertMany(input)
      const mapped = nuevasMesas.map(mapMesa)
      try { getIO().emit('mesas:created', mapped) } catch (e) { }
      return res.status(201).json(mapped)
    }

    const nuevaMesa = new Mesa({
      numero: body.name || body.numero,
      capacidad: body.capacity || body.capacidad,
      ubicacion: body.location || body.ubicacion,
      estado: estadoFrontendToBackend(body.status || body.estado) || 'Libre',
      tipo: body.type || body.tipo || 'normal'
    })

    await nuevaMesa.save()
    const mapped = mapMesa(nuevaMesa)
    try { getIO().emit('mesas:created', mapped) } catch (e) { }
    res.status(201).json(mapped)
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al crear la mesa', error: error.message || error })
  }
}

export const obtenerMesas = async (req: Request, res: Response) => {
  try {
    const { location } = req.query // Extraemos el parámetro 'location' de la URL
    let filtro: any = {}

    // Si el usuario envía una ubicación, filtramos. Ej: ?location=Terraza
    if (location) {
      filtro = { ubicacion: location }
    }

    const mesas = await Mesa.find(filtro)
    res.status(200).json(mesas.map(mapMesa))
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al obtener las mesas', error: error.message || error })
  }
}

export const obtenerMesaPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const mesa = await Mesa.findById(id)
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
    if (body.location !== undefined) update.ubicacion = body.location
    if (body.status !== undefined) update.estado = estadoFrontendToBackend(body.status)
    if (body.type !== undefined) update.tipo = body.type

    const mesaActualizada = await Mesa.findByIdAndUpdate(id, update, { new: true })
    if (!mesaActualizada) return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    const mapped = mapMesa(mesaActualizada)
    try { getIO().emit('mesas:updated', mapped) } catch (e) { }
    res.status(200).json(mapped)
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al actualizar la mesa', error: error.message || error })
  }
}

export const actualizarEstadoMesa = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { estado } = req.body // El cliente manda el nuevo estado: 'Libre', 'Ocupada', etc.

    const mesaActualizada = await Mesa.findByIdAndUpdate(id, { estado }, { new: true })

    if (!mesaActualizada) {
      return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    }

    const mapped = mapMesa(mesaActualizada)
    try { getIO().emit('mesas:updated', mapped) } catch (e) { }

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
    try { getIO().emit('mesas:deleted', mapped) } catch (e) { }
    res.status(200).json({ mensaje: 'Mesa eliminada', mesa: mapped })
  } catch (error: any) {
    res.status(500).json({ mensaje: 'Error al eliminar mesa', error: error.message || error })
  }
}
