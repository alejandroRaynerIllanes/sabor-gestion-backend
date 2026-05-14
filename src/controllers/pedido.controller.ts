// src/controllers/pedido.controller.ts
import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'

export const crearPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Registrar el nuevo pedido y generar un código seguro basado en su ObjectID
    const nuevoPedido = new Pedido(req.body)
    nuevoPedido.codigo = `PED-${String(nuevoPedido._id).slice(-4).toUpperCase()}`
    await nuevoPedido.save()

    // 2. Poblar datos para que cocina reciba el nombre del plato y no solo el ID
    const pedidoPoblado = await Pedido.findById(nuevoPedido._id)
      .populate('detalles.plato', 'nombre precio')
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido')

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

export const obtenerPedidos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hoy, fecha } = req.query
    const filtro: any = {}

    if (hoy === 'true') {
      const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0);
      const finHoy = new Date(); finHoy.setHours(23, 59, 59, 999);
      filtro.createdAt = { $gte: inicioHoy, $lte: finHoy };
    } else if (fecha) {
      const inicio = new Date(fecha as string); inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fecha as string); fin.setHours(23, 59, 59, 999);
      filtro.createdAt = { $gte: inicio, $lte: fin };
    }

    const pedidos = await Pedido.find(filtro)
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido')
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
      .populate('usuario', 'nombre apellido')

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
      if (estado === 'ENTREGADO' || estado === 'Listos') {
        console.log('🔔 [WEBSOCKET] Emitiendo alerta de listo a meseros para pedido:', pedidoActualizado._id.toString());
        // Le gritamos al frontend del Mesero para que encienda el badge verde de "¡LISTO!"
        io.emit('mesas:alerta_listo', {
          pedidoId: pedidoActualizado._id.toString(),
          mesaId: pedidoActualizado.mesa ? ((pedidoActualizado.mesa as any)._id?.toString() || pedidoActualizado.mesa.toString()) : undefined,
          mesaNombre: pedidoActualizado.mesa ? ((pedidoActualizado.mesa as any).numero || (pedidoActualizado.mesa as any).name || (pedidoActualizado.mesa as any).nombre || 'Mesa') : '?'
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

export const actualizarPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    // Agregamos los campos de la pre-cuenta
    const { total, detalles, clienteNombre, clienteCI, clienteNIT, cajeroAsignado, montoDescuento, montoPropina, subtotalCierre } = req.body

    const pedidoAnterior = await Pedido.findById(id);
    const updates: any = {};
    if (total !== undefined) updates.total = total;
    if (detalles !== undefined) updates.detalles = detalles;
    
    if (pedidoAnterior && pedidoAnterior.estado === 'SERVIDO') {
       updates.estado = 'ABIERTO';
    }
    
    // Guardar los campos de la pre-cuenta (permitido dinámicamente si el modelo usa strict: false o si están definidos)
    if (clienteNombre !== undefined) updates.clienteNombre = clienteNombre;
    if (clienteCI !== undefined) updates.clienteCI = clienteCI;
    if (clienteNIT !== undefined) updates.clienteNIT = clienteNIT;
    if (cajeroAsignado !== undefined) updates.cajeroAsignado = cajeroAsignado;
    if (montoDescuento !== undefined) updates.montoDescuento = montoDescuento;
    if (montoPropina !== undefined) updates.montoPropina = montoPropina;
    if (subtotalCierre !== undefined) updates.subtotalCierre = subtotalCierre;

    // Actualizamos los platos y el nuevo total del pedido existente
    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, strict: false } // strict: false previene que mongoose borre campos no declarados temporalmente
    )
      .populate('detalles.plato', 'nombre precio')
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido')

    if (!pedidoActualizado) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    // REPARACIÓN CRÍTICA: Forzar la mesa a Ocupada en BD por si estaba desfasada y notificar a la red
    if (pedidoActualizado.mesa) {
      const mesaId = typeof pedidoActualizado.mesa === 'object' ? (pedidoActualizado.mesa as any)._id : pedidoActualizado.mesa;
      await Mesa.findByIdAndUpdate(mesaId, { estado: 'Ocupada' });
      try {
        getIO().emit('mesas:updated', {
          id: mesaId.toString(),
          status: 'Ocupada',
          name: (pedidoActualizado.mesa as any).numero || 'Mesa'
        })
      } catch(e) {}
    }

    // Avisamos a la cocina en tiempo real que este pedido tiene platos nuevos
    try { getIO().emit('cocina:actualizar_tablero', pedidoActualizado) } catch (e) {}
    
    // Si el mesero asignó un cajero, emitimos el evento de nueva cuenta
    if (cajeroAsignado) {
      try { getIO().emit('caja:nueva_cuenta', pedidoActualizado) } catch (e) {}
    }

    res.status(200).json(pedidoActualizado)
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al actualizar el pedido', error: err.message })
  }
}
