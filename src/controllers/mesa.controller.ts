import { Request, Response } from 'express'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket';

export const crearMesa = async (req: Request, res: Response) => {
  try {
    // Si mandas un array [{}], usamos insertMany. Si es uno solo {}, usamos save().
    if (Array.isArray(req.body)) {
      const nuevasMesas = await Mesa.insertMany(req.body)
      return res.status(201).json(nuevasMesas)
    }

    const nuevaMesa = new Mesa(req.body)
    await nuevaMesa.save()
    res.status(201).json(nuevaMesa)
  } catch (error) {
    // Esto te dirá exactamente qué campo falló si vuelve a dar error
    res.status(500).json({ mensaje: 'Error al crear la mesa', error })
  }
}

export const obtenerMesas = async (req: Request, res: Response) => {
  try {
    const { location } = req.query // Extraemos el parámetro 'location' de la URL
    let filtro = {}

    // Si el usuario envía una ubicación, filtramos. Ej: ?location=Terraza
    if (location) {
      filtro = { ubicacion: location }
    }

    const mesas = await Mesa.find(filtro)
    res.status(200).json(mesas)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las mesas', error })
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

    res.status(200).json(mesaActualizada)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar estado', error })
  }
}
