// src/controllers/pedido.controller.ts
import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'
import CierreCaja from '../models/CierreCaja'
import Reserva from '../models/Reserva'
import { ESTADOS_MESA, ESTADOS_PEDIDO } from '../utils/constants'
import { PedidoService } from '../services/pedido.service'
import { obtenerFechaBolivia, formatearFechaBolivia } from '../utils/fechaBolivia'

const agregarFechaBoliviaPedido = (pedido: any) => {
  const pedidoPlano = typeof pedido.toObject === 'function' ? pedido.toObject() : pedido
  const { _id, codigo, fechaHoraBolivia, fechaHora, ...restoPedido } = pedidoPlano

  return {
    _id,
    codigo,
    ...restoPedido,
    fechaHoraBolivia:
      fechaHoraBolivia || (fechaHora ? formatearFechaBolivia(fechaHora) : undefined),
    fechaHora
  }
}

export const crearPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Registrar el nuevo pedido y generar un código seguro basado en su ObjectID
    const pedidoId = new mongoose.Types.ObjectId()
    const fechaHora = obtenerFechaBolivia()
    const nuevoPedido = new Pedido({
      _id: pedidoId,
      codigo: `PED-${String(pedidoId).slice(-4).toUpperCase()}`,
      ...req.body,
      fechaHoraBolivia: formatearFechaBolivia(fechaHora),
      fechaHora
    })
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
      { estado: ESTADOS_MESA.OCUPADA },
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
          status: ESTADOS_MESA.OCUPADA,
          name: mesaActualizada.numero
        })
      }
    } catch (socketError) {
      console.warn('Pedido guardado, pero falló la notificación en tiempo real')
    }

    res.status(201).json(agregarFechaBoliviaPedido(nuevoPedido))
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al registrar el pedido', error: err.message })
  }
}

export const obtenerPedidos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hoy, fecha, mesa, activo, cajero, mesero, reportesCierre } = req.query
    const filtro: any = {}

    // 🔥 Endpoint para consultar los Reportes de Cierre reales de la BD
    if (reportesCierre === 'true') {
      const limite = obtenerFechaBolivia(); 
      limite.setHours(limite.getHours() - 48); // Ampliamos el margen a 48h para evitar cortes por UTC (Zona horaria)
      const cierres = await CierreCaja.find({ 
        fechaCierre: { $gte: limite } 
      }).sort({ fechaCierre: -1 });
      const cierresFormateados = cierres.map((cierre: any) => {
        const cierrePlano = typeof cierre.toObject === 'function' ? cierre.toObject() : cierre
        const { fechaCierreBolivia, fechaCierre, ...restoCierre } = cierrePlano

        return {
          ...restoCierre,
          fechaCierreBolivia:
            fechaCierreBolivia || (fechaCierre ? formatearFechaBolivia(fechaCierre) : undefined),
          fechaCierre
        }
      })

      res.status(200).json(cierresFormateados);
      return;
    }

    if (hoy === 'true') {
      const inicioHoy = obtenerFechaBolivia()
      inicioHoy.setHours(0, 0, 0, 0)
      const finHoy = new Date()
      finHoy.setHours(23, 59, 59, 999)
      filtro.createdAt = { $gte: inicioHoy, $lte: finHoy }
    } else if (fecha) {
      const inicio = new Date(`${fecha}T00:00:00`)
      const fin = new Date(`${fecha}T23:59:59.999`)
      filtro.createdAt = { $gte: inicio, $lte: fin }
    }

    if (mesa) {
      filtro.mesa = mesa
    }
    if (activo === 'true') {
      filtro.estado = { $in: [ESTADOS_PEDIDO.ABIERTO, ESTADOS_PEDIDO.EN_PREPARACION, ESTADOS_PEDIDO.ENTREGADO, 'SERVIDO'] }
    }
    if (cajero) {
      filtro.cajeroAsignado = cajero
    }
    if (mesero) {
      filtro.usuario = mesero
    }

    const pedidos = await Pedido.find(filtro)
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido')
      .populate('cajeroAsignado', 'nombre apellido')
      .populate('detalles.plato', 'nombre precio')
      .sort({ createdAt: -1 }) // Los más recientes primero

    res.status(200).json(pedidos.map((pedido) => agregarFechaBoliviaPedido(pedido)))
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

    pedido.estado = ESTADOS_PEDIDO.CANCELADO
    await pedido.save()

    // Si el pedido tenía una mesa asignada, la liberamos
    if (pedido.mesa) {
      const inicioHoy = obtenerFechaBolivia()
      inicioHoy.setHours(0, 0, 0, 0)
      const reservasPendientes = await Reserva.countDocuments({
        mesa: pedido.mesa,
        fecha: { $gte: inicioHoy }
      })
      const nuevoEstado = reservasPendientes > 0 ? 'Reservada' : 'Libre'

      const mesaLiberada = await Mesa.findByIdAndUpdate(
        pedido.mesa,
        { estado: nuevoEstado },
        { new: true }
      )

      // Avisar por WebSocket que la mesa vuelve a estar disponible (verde)
      if (mesaLiberada) {
        getIO().emit('mesas:updated', {
          id: mesaLiberada._id.toString(),
          status: nuevoEstado === 'Libre' ? 'Disponible' : 'Reservada'
        })
      }
    }

    res.status(200).json({
      mensaje: 'Pedido anulado y mesa liberada correctamente',
      pedido: agregarFechaBoliviaPedido(pedido)
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
      if (estado === ESTADOS_PEDIDO.ENTREGADO || estado === 'Listos') {
        console.log(
          '🔔 [WEBSOCKET] Emitiendo alerta de listo a meseros para pedido:',
          pedidoActualizado._id.toString()
        )
        // Le gritamos al frontend del Mesero para que encienda el badge verde de "¡LISTO!"
        io.emit('mesas:alerta_listo', {
          pedidoId: pedidoActualizado._id.toString(),
          mesaId: pedidoActualizado.mesa
            ? (pedidoActualizado.mesa as any)._id?.toString() || pedidoActualizado.mesa.toString()
            : undefined,
          mesaNombre: pedidoActualizado.mesa
            ? (pedidoActualizado.mesa as any).numero ||
              (pedidoActualizado.mesa as any).name ||
              (pedidoActualizado.mesa as any).nombre ||
              'Mesa'
            : '?'
        })
      }
    } catch (socketError) {
      console.warn('Estado actualizado, pero falló la emisión del socket')
    }

    res.status(200).json({
      mensaje: `Pedido movido a ${estado}`,
      pedido: agregarFechaBoliviaPedido(pedidoActualizado)
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
    const {
      total,
      detalles,
      clienteNombre,
      clienteCI,
      clienteNIT,
      cajeroAsignado,
      montoDescuento,
      montoPropina,
      subtotalCierre
    } = req.body

    const pedidoAnterior = await Pedido.findById(id)
    const updates: any = {}
    if (total !== undefined) updates.total = total
    if (detalles !== undefined) updates.detalles = detalles

    // Solo reabrir el pedido a ABIERTO si se están agregando nuevos platos (detalles)
    if (pedidoAnterior && pedidoAnterior.estado === ESTADOS_PEDIDO.ENTREGADO && detalles !== undefined) {
      updates.estado = ESTADOS_PEDIDO.ABIERTO
    }

    // Guardar los campos de la pre-cuenta (permitido dinámicamente si el modelo usa strict: false o si están definidos)
    if (clienteNombre !== undefined) updates.clienteNombre = clienteNombre
    if (clienteCI !== undefined) updates.clienteCI = clienteCI
    if (clienteNIT !== undefined) updates.clienteNIT = clienteNIT
    if (cajeroAsignado !== undefined) updates.cajeroAsignado = cajeroAsignado
    if (montoDescuento !== undefined) updates.montoDescuento = montoDescuento
    if (montoPropina !== undefined) updates.montoPropina = montoPropina
    if (subtotalCierre !== undefined) updates.subtotalCierre = subtotalCierre

    // Actualizamos los platos y el nuevo total del pedido existente
    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true } // SOLUCIÓN: Activamos de nuevo la seguridad estricta de Mongoose porque los campos ya están en el modelo
    )
      .populate('detalles.plato', 'nombre precio')
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido')

    if (!pedidoActualizado) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    // REPARACIÓN CRÍTICA (Bug 1): Solo forzar la mesa a Ocupada si se agregaron nuevos platos
    // y el pedido realmente se reabrió. Evita que la mesa desaparezca de la Caja al poner el NIT.
    if (pedidoActualizado.mesa) {
      const mesaId =
        typeof pedidoActualizado.mesa === 'object'
          ? (pedidoActualizado.mesa as any)._id
          : pedidoActualizado.mesa
      
      if (updates.estado === ESTADOS_PEDIDO.ABIERTO) {
        await Mesa.findByIdAndUpdate(mesaId, { estado: ESTADOS_MESA.OCUPADA })
        try {
          getIO().emit('mesas:updated', {
            id: mesaId.toString(),
            status: ESTADOS_MESA.OCUPADA,
            name: (pedidoActualizado.mesa as any).numero || 'Mesa'
          })
        } catch (e) {}
      }
    }

    // Avisamos a la cocina en tiempo real que este pedido tiene platos nuevos
    try {
      getIO().emit('cocina:actualizar_tablero', pedidoActualizado)
    } catch (e) {}

    // Si el mesero asignó un cajero, emitimos el evento de nueva cuenta
    // Si el mesero asignó un cajero, emitimos el evento de nueva cuenta
    if (cajeroAsignado) {
      const payloadCaja = PedidoService.formatearPayloadCaja(pedidoActualizado)

      try {
        const io = getIO()

        // Evento que ya existía en el backend
        io.emit('caja:nueva_cuenta', payloadCaja)

        // Evento sugerido por el documento del frontend
        io.emit('caja:solicitud_pago', payloadCaja)
      } catch (e) {}
    }

    res.status(200).json(agregarFechaBoliviaPedido(pedidoActualizado))
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al actualizar el pedido', error: err.message })
  }
}

export const obtenerPedidosPendientesCobro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cajero } = req.query

    // 1. Buscamos las mesas que ya solicitaron cuenta
    const mesasConCuentaSolicitada = await Mesa.find({
      estado: ESTADOS_MESA.CUENTA_SOLICITADA
    }).select('_id')

    const mesaIds = mesasConCuentaSolicitada.map((mesa) => mesa._id)

    const filtroPedidos: any = {
      estado: ESTADOS_PEDIDO.ENTREGADO,
      mesa: { $in: mesaIds }
    }

    if (cajero) {
      filtroPedidos.$or = [
        { cajeroAsignado: cajero },
        { cajeroAsignado: null },
        { cajeroAsignado: { $exists: false } }
      ]
    }

    // 2. Buscamos pedidos entregados asociados a esas mesas
    const pedidos = await Pedido.find(filtroPedidos)
      .populate('mesa', 'numero estado')
      .populate('usuario', 'nombre apellido')
      .populate('detalles.plato', 'nombre precio')
      .sort({ updatedAt: -1 })

    // 3. Formateamos la respuesta para que sea cómoda para el frontend
    const respuesta = pedidos.map((pedido: any) => ({
      ...PedidoService.formatearPayloadCaja(pedido),
      fechaHoraBolivia: pedido.fechaHora ? formatearFechaBolivia(pedido.fechaHora) : undefined
    }))

    res.status(200).json(respuesta)
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      mensaje: 'Error al obtener pedidos pendientes de cobro',
      error: err.message
    })
  }
}

export const solicitarCuentaPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const pedido = await Pedido.findById(id)

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    if (!pedido.mesa) {
      res.status(400).json({
        mensaje: 'No se puede solicitar cuenta porque el pedido no tiene una mesa asignada.'
      })
      return
    }

    // FLEXIBILIZACIÓN (Bug 2): Permitir pedir cuenta aunque el chef no haya tocado el pedido (Ej: Solo bebidas).
    if (pedido.estado === ESTADOS_PEDIDO.CANCELADO || pedido.estado === ESTADOS_PEDIDO.CERRADO) {
      res.status(400).json({
        mensaje: 'No se puede solicitar cuenta de un pedido que ya está cerrado o cancelado.'
      })
      return
    }

    const mesaActualizada = await Mesa.findByIdAndUpdate(
      pedido.mesa,
      { estado: ESTADOS_MESA.CUENTA_SOLICITADA },
      { new: true }
    )

    if (!mesaActualizada) {
      res.status(404).json({ mensaje: 'Mesa no encontrada' })
      return
    }

    const pedidoPoblado = await Pedido.findById(id)
      .populate('mesa', 'numero estado')
      .populate('usuario', 'nombre apellido')
      .populate('detalles.plato', 'nombre precio')

    const payload = PedidoService.formatearPayloadCaja(pedidoPoblado, mesaActualizada)

    try {
      const io = getIO()

      // Evento equivalente para pantalla de caja.
      io.emit('caja:nueva_cuenta', payload)

      // Evento recomendado por el documento del frontend.
      io.emit('caja:solicitud_pago', payload)

      // También avisamos a todos que la mesa cambió de estado.
      io.emit('mesas:updated', {
        id: mesaActualizada._id.toString(),
        status: 'Esperando pago',
        name: mesaActualizada.numero
      })
    } catch (socketError) {
      console.warn('Cuenta solicitada, pero falló la notificación en tiempo real')
    }

    res.status(200).json({
      mensaje: 'Cuenta solicitada correctamente',
      solicitud: payload
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      mensaje: 'Error al solicitar la cuenta',
      error: err.message
    })
  }
}
