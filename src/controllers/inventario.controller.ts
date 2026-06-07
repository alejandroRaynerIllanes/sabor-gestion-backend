// src/controllers/inventario.controller.ts
import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Ingrediente from '../models/Ingrediente'
import MovimientoInventario from '../models/MovimientoInventario'

/**
 * Obtiene el estado actual de todos los ingredientes en el inventario.
 * Retorna la lista ordenada por stockActual (de menor a mayor) para visualizar rápidamente alertas.
 */
export const obtenerEstadoInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const ingredientes = await Ingrediente.find().sort({ stockActual: 1 })
    res.status(200).json(ingredientes)
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      mensaje: 'Error al obtener el estado del inventario',
      error: err.message
    })
  }
}

/**
 * Registra una entrada de stock para un ingrediente.
 * Suma la cantidad al stock actual, actualiza el estado y genera un movimiento de tipo 'Entrada'.
 * Todo el proceso corre dentro de una transacción de MongoDB para asegurar consistencia.
 */
export const registrarEntradaStock = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { ingredienteId, cantidad, costo } = req.body

    // Validaciones
    if (!ingredienteId || cantidad === undefined || cantidad === null) {
      res.status(400).json({ mensaje: 'Los campos ingredienteId y cantidad son requeridos.' })
      await session.abortTransaction()
      session.endSession()
      return
    }

    const cantidadNum = Number(cantidad)
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      res.status(400).json({ mensaje: 'La cantidad debe ser un número mayor a cero.' })
      await session.abortTransaction()
      session.endSession()
      return
    }

    // Buscar ingrediente
    const ingrediente = await Ingrediente.findById(ingredienteId).session(session)
    if (!ingrediente) {
      res.status(404).json({ mensaje: 'Ingrediente no encontrado.' })
      await session.abortTransaction()
      session.endSession()
      return
    }

    // Actualizar stock
    const stockAnterior = ingrediente.stockActual
    const nuevoStock = stockAnterior + cantidadNum

    // Recalcular estado
    let nuevoEstado: 'Disponible' | 'Bajo' | 'Agotado' = 'Disponible'
    if (nuevoStock <= 0) {
      nuevoEstado = 'Agotado'
    } else if (nuevoStock <= ingrediente.stockMinimo) {
      nuevoEstado = 'Bajo'
    }

    ingrediente.stockActual = nuevoStock
    ingrediente.estado = nuevoEstado
    await ingrediente.save({ session })

    // Crear el movimiento de inventario de entrada
    const descripcionMovimiento = costo 
      ? `Entrada manual de stock. Costo asociado: Bs. ${costo}` 
      : 'Entrada manual de stock'

    const [nuevoMovimiento] = await MovimientoInventario.create(
      [
        {
          ingrediente: ingrediente._id,
          tipoMovimiento: 'Entrada',
          cantidad: cantidadNum,
          descripcion: descripcionMovimiento
        }
      ],
      { session }
    )

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({
      mensaje: 'Entrada de stock registrada correctamente.',
      ingrediente: {
        id: ingrediente._id,
        nombre: ingrediente.nombre,
        stockAnterior,
        stockActual: nuevoStock,
        estado: nuevoEstado
      },
      movimiento: nuevoMovimiento
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    const err = error as Error
    res.status(500).json({
      mensaje: 'Error al registrar la entrada de stock.',
      error: err.message
    })
  }
}
