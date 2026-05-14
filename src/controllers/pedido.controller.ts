// src/controllers/pedido.controller.ts
import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'

export const crearPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Registrar el nuevo pedido
    const ultimoPedido = await Pedido.findOne().sort({ createdAt: -1 })

    let nuevoNumero = 1
    if (ultimoPedido && ultimoPedido.codigo) {
      const partes = ultimoPedido.codigo.split('-')
      if (partes.length === 2) {
        const numeroAnterior = parseInt(partes[1], 10)
        if (!isNaN(numeroAnterior)) {
          nuevoNumero = numeroAnterior + 1
        }
      }
    }

    const codigoGenerado = `PED-${nuevoNumero.toString().padStart(4, '0')}`

    const nuevoPedido = new Pedido({ ...req.body, codigo: codigoGenerado })
    await nuevoPedido.save()

    // 2. Poblar datos para que cocina reciba el nombre del plato y no solo el ID
    const pedidoPoblado = await Pedido.findById(nuevoPedido._id)
      .populate('detalles.plato', 'nombre precio')
      .populate('mesa', 'numero')

    // 3. AUTOMATIZACIÓN: Cambiar estado de la mesa a 'Ocupada'
    const mesaId = req.body.mesa
    const mesaActualizada = await Mesa.findByIdAndUpdate(
      mesaId,
      { estado: 'Ocupada' },
      { new: true }
    ).populate('ubicacionId', 'nombre')

    // 4. WEBSOCKETS: Notificar a los actores del sistema
    try {
      const io = getIO()

      // Notificar a cocina para que aparezca el ticket en "Por hacer"
      io.emit('cocina:nuevo_pedido', pedidoPoblado)

      // Notificar a todos los meseros que la mesa ahora está ocupada (se pone roja)
      if (mesaActualizada) {
        // Usamos un mapeo simple para el socket
        io.emit('mesas:updated', {
          id: mesaActualizada._id.toString(),
          status: 'Ocupada',
          name: mesaActualizada.numero
        })
      }
    } catch (socketError) {
      console.warn('Pedido guardado, pero falló la notificación en tiempo real')
    }

    res.status(201).json(nuevoPedido)
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al registrar el pedido', error: err.message })
  }
}

export const obtenerPedidos = async (req: Request, res: Response) => {
  try {
    const pedidos = await Pedido.find()
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre')
      .populate('detalles.plato', 'nombre precio')
      .sort({ createdAt: -1 }) // Los más recientes primero

    res.status(200).json(pedidos)
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al obtener los pedidos', error: err.message })
  }
}

export const cancelarPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const pedido = await Pedido.findById(id)

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    pedido.estado = 'CANCELADO'
    await pedido.save()

    // Si el pedido tenía una mesa asignada, la liberamos
    if (pedido.mesa) {
      const mesaLiberada = await Mesa.findByIdAndUpdate(
        pedido.mesa,
        { estado: 'Libre' },
        { new: true }
      )

      // Avisar por WebSocket que la mesa vuelve a estar disponible (verde)
      if (mesaLiberada) {
        getIO().emit('mesas:updated', {
          id: mesaLiberada._id.toString(),
          status: 'Disponible'
        })
      }
    }

    res.status(200).json({
      mensaje: 'Pedido anulado y mesa liberada correctamente',
      pedido
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al procesar la cancelación', error: err.message })
  }
}

// Añadir al final de src/controllers/pedido.controller.ts

export const actualizarEstadoPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    // El frontend enviará: { "estado": "Cocinando" } o { "estado": "Listos" }
    const { estado } = req.body

    // 1. Actualizamos el estado en la base de datos
    const pedidoActualizado = await Pedido.findByIdAndUpdate(id, { estado }, { new: true })
      .populate('mesa', 'numero')
      .populate('detalles.plato', 'nombre precio')

    if (!pedidoActualizado) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    // 2. WEBSOCKETS: La magia de la sincronización
    try {
      const io = getIO()

      // A) Avisar a las pantallas de cocina para que muevan la tarjeta de columna
      io.emit('cocina:actualizar_tablero', pedidoActualizado)

      // B) EL EVENTO CLAVE: Si el chef presionó "Terminado/Listos"
      if (estado === 'Listos') {
        // Le gritamos al frontend del Mesero para que encienda el badge verde de "¡LISTO!"
        io.emit('mesas:alerta_listo', {
          pedidoId: pedidoActualizado._id.toString(),
          mesaId: pedidoActualizado.mesa?._id.toString(),
          mesaNombre: (pedidoActualizado.mesa as any)?.numero
        })
      }
    } catch (socketError) {
      console.warn('Estado actualizado, pero falló la emisión del socket')
    }

    res.status(200).json({
      mensaje: `Pedido movido a ${estado}`,
      pedido: pedidoActualizado
    })
  } catch (error) {
    const err = error as Error
    res
      .status(500)
      .json({ mensaje: 'Error al actualizar el estado del pedido', error: err.message })
  }
}
