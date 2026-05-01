import { Request, Response } from 'express'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'
import mongoose from 'mongoose'

// --- INTERFACES GLOBALES DE MESAS ---
export interface IMesaPayload {
  name?: string;
  numero?: string;
  capacity?: number;
  capacidad?: number;
  status?: string;
  estado?: string;
  type?: string;
  tipo?: string;
  location?: string;
  ubicacion?: string;
}

export interface IMesaDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  numero: string;
  capacidad: number;
  estado: string;
  tipo: string;
  ubicacionId?: any; // Puede venir populado
  ubicacion?: string;
}

// Mapeos de estados para compatibilidad con el Frontend
const estadoBackendToFrontend = (estado?: string): string => {
  if (!estado) return 'Disponible'
  if (estado === 'Libre') return 'Disponible'
  if (estado === 'Cuenta Solicitada') return 'Esperando pago'
  return estado
}

const estadoFrontendToBackend = (status?: string): string | undefined => {
  if (!status) return undefined
  if (status === 'Disponible') return 'Libre'
  if (status === 'Esperando pago') return 'Cuenta Solicitada'
  return status
}

const validarNombreMesa = (nombre: string | undefined): { valido: boolean; mensaje?: string } => {
  if (!nombre) return { valido: false, mensaje: 'El nombre de la mesa es requerido.' }
  const nom = String(nombre).toLowerCase().trim()

  const regexEspeciales = /^[a-záéíóúñ0-9\s]+$/i
  if (!regexEspeciales.test(nom)) return { valido: false, mensaje: 'No se permiten símbolos especiales.' }
  
  if (!nom.includes('mesa')) return { valido: false, mensaje: 'El nombre debe incluir la palabra "mesa".' }
  
  const ubicaciones = ['interior', 'patio', 'terraza']
  if (!ubicaciones.some((ub) => nom.includes(ub))) {
    return { valido: false, mensaje: 'El nombre debe incluir una ubicación válida (interior, patio, terraza).' }
  }
  
  const numeros = nom.match(/\d+/g)
  if (numeros) {
    for (const numStr of numeros) {
      if (numStr.length > 3) return { valido: false, mensaje: 'No se permiten más de 3 dígitos numéricos consecutivos.' }
      if (parseInt(numStr, 10) > 50) return { valido: false, mensaje: 'El número de mesa no puede ser mayor a 50.' }
    }
  }
  return { valido: true }
}

/**
 * HELPER DE MAPEO ULTRA-COMPATIBLE
 * Soluciona el problema de visibilidad asegurando que el ID sea string
 * y que la ubicación siempre tenga un valor coherente.
 */
const mapMesa = (m: IMesaDocument | any) => {
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

export const crearMesa = async (req: Request, res: Response): Promise<any> => {
  try {
    const body = req.body
    if (Array.isArray(body)) {
      // Validar cada mesa en el array antes de procesar
      for (const p of body) {
        const validacion = validarNombreMesa(p.name || p.numero)
        if (!validacion.valido) {
          return res.status(400).json({ mensaje: validacion.mensaje })
        }
      }

      const input = body.map((p: IMesaPayload) => {
        const base: Record<string, any> = {
          numero: p.name || p.numero,
          capacidad: p.capacity || p.capacidad,
          estado: estadoFrontendToBackend(p.status || p.estado) || 'Libre',
          tipo: p.type || 'normal'
        }
        const loc = p.location || p.ubicacion
        if (loc && mongoose.Types.ObjectId.isValid(String(loc))) base.ubicacionId = loc
        else base.ubicacion = loc
        return base
      })

      const nuevasMesas = await Mesa.insertMany(input)
      const pobladas = await Mesa.find({
        _id: { $in: nuevasMesas.map((m) => m._id) }
      }).populate('ubicacionId', 'nombre')
      const mapped = pobladas.map(mapMesa)

      try {
        getIO().emit('mesas:created', mapped)
      } catch (e) {
        console.warn('Socket error', e)
      }
      return res.status(201).json(mapped)
    }

    const nombreIngresado = body.name || body.numero
    const validacion = validarNombreMesa(nombreIngresado)
    if (!validacion.valido) {
      return res.status(400).json({ mensaje: validacion.mensaje })
    }

    const mesaData: Record<string, any> = {
      numero: nombreIngresado,
      capacidad: body.capacity || body.capacidad,
      estado: estadoFrontendToBackend(body.status || body.estado) || 'Libre',
      tipo: body.type || 'normal'
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
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la mesa', error })
  }
};

// 2. Obtener todas las mesas
export const obtenerMesas = async (req: Request, res: Response) => {
  try {
    const { location } = req.query
    let filtro: Record<string, any> = {}

    if (location) {
      if (mongoose.Types.ObjectId.isValid(String(location))) filtro = { ubicacionId: location }
      else filtro = { ubicacion: location }
    }

    const mesas = await Mesa.find(filtro).populate('ubicacionId', 'nombre')
    res.status(200).json(mesas.map(mapMesa))
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las mesas', error })
  }
}

export const obtenerMesaPorId = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const mesa = await Mesa.findById(id).populate('ubicacionId', 'nombre')
    if (!mesa) return res.status(404).json({ mensaje: 'Mesa no encontrada' })
    res.status(200).json(mapMesa(mesa))
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la mesa', error })
  }
}

export const actualizarMesa = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params
    const body: IMesaPayload = req.body
    const update: Record<string, any> = {}

    if (body.name !== undefined) {
      const validacion = validarNombreMesa(body.name)
      if (!validacion.valido) {
        return res.status(400).json({ mensaje: validacion.mensaje })
      }
      update.numero = body.name
    }
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
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar la mesa', error })
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
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar estado', error })
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
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar mesa', error })
  }
};