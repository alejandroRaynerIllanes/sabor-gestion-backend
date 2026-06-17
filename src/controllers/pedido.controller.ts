import { Request, Response } from 'express'
import mongoose from 'mongoose'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import Plato from '../models/Plato'
import { getIO } from '../socket/socket'
import CierreCaja from '../models/CierreCaja'
import Reserva from '../models/Reserva'
import Pago from '../models/Pago'
import { ESTADOS_MESA, ESTADOS_PEDIDO } from '../utils/constants'
import { PedidoService } from '../services/pedido.service'
import { obtenerFechaBolivia, formatearFechaBolivia } from '../utils/fechaBolivia'
import { CustomRequest } from '../middlewares/auth.middleware'
import { asignarRepartidorDisponible } from '../services/delivery.service'

// procesarDescuentoPedido es invocado internamente por PedidoService.actualizarEstadoService

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
      .populate('usuario', 'nombre apellido apellidos')

    // 3. AUTOMATIZACIÓN: Cambiar estado de la mesa a 'Ocupada'
    const mesaId = req.body.mesa
    const mesaActualizada = await Mesa.findByIdAndUpdate(
      mesaId,
      { estado: ESTADOS_MESA.OCUPADA },
      { returnDocument: 'after' }
    ).populate('ubicacionId', 'nombre')

    // 4. WEBSOCKETS: Notificar a los actores del sistema
    try {
      const io = getIO()

      // Notificar a cocina para que aparezca el ticket en "Por hacer"
      io.emit('cocina:nuevo_pedido', pedidoPoblado)

      // Notificar a todos los meseros que la mesa ahora está ocupada (se pone roja)
      if (mesaActualizada) {
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

    //  Endpoint para consultar los Reportes de Cierre reales de la BD
    if (reportesCierre === 'true') {
      const limite = obtenerFechaBolivia()
      limite.setHours(limite.getHours() - 48) // Ampliamos el margen a 48h para evitar cortes por UTC (Zona horaria)
      const cierres = await CierreCaja.find({
        fechaCierre: { $gte: limite }
      }).sort({ fechaCierre: -1 })
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

      res.status(200).json(cierresFormateados)
      return
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
      filtro.estado = {
        $in: [
          ESTADOS_PEDIDO.ABIERTO,
          ESTADOS_PEDIDO.EN_PREPARACION,
          ESTADOS_PEDIDO.ENTREGADO,
          'SERVIDO'
        ]
      }
    }
    if (cajero) {
      const pagosDelCajero = await Pago.find({ cajero: String(cajero) }).select('pedido')
      const pedidoIds = pagosDelCajero.map((p) => p.pedido)
      filtro._id = { $in: pedidoIds }
    }
    if (mesero) {
      filtro.usuario = mesero
    }

    const pedidos = await Pedido.find(filtro)
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido apellidos')
      .populate('detalles.plato', 'nombre precio')
      .sort({ createdAt: -1 })

    // Buscar todos los pagos asociados (Separación de Pagos y Pedidos)
    const allPedidoIds = pedidos.map((p) => p._id)
    const pagos = await Pago.find({ pedido: { $in: allPedidoIds } }).populate('cajero', 'nombre apellido')

    const respuesta = pedidos.map((pedido) => {
      const pedidoObj = agregarFechaBoliviaPedido(pedido)
      const pago = pagos.find((p) => p.pedido.toString() === pedido._id.toString())
      if (pago) {
        pedidoObj.metodoPago = pago.metodoPago
        pedidoObj.montoDescuento = pago.descuento
        pedidoObj.montoPropina = pago.propina
        pedidoObj.subtotalCierre = pago.subtotal
        pedidoObj.clienteNombre = pago.nombreCliente
        pedidoObj.clienteCI = pago.ci
        pedidoObj.clienteNIT = pago.nit
        pedidoObj.cajeroAsignado = pago.cajero
      }
      return pedidoObj
    })

    res.status(200).json(respuesta)
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

    // NUEVO: Si fue un pedido de delivery, devolver el stock reservado de los Platos
    const pedidoPlano = typeof pedido.toObject === 'function' ? pedido.toObject() : pedido
    if (pedidoPlano.metodoEntrega === 'delivery' && Array.isArray(pedidoPlano.detalles)) {
      for (const item of pedidoPlano.detalles) {
        await Plato.findByIdAndUpdate(item.plato, {
          $inc: { stock: Number(item.cantidad) } // Sumamos de vuelta la cantidad
        })
      }
    }

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
        { returnDocument: 'after' }
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

export const actualizarEstadoPedido = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { estado } = req.body

    // 1. Delegar toda la lógica de negocio al servicio
    //    (busca el pedido, actualiza estado, descuenta inventario si aplica)
    const { pedidoActualizado, disparaAlertaListo } = await PedidoService.actualizarEstadoService(
      String(id),
      String(estado)
    )

    // 2. WEBSOCKETS — responsabilidad del controlador (el servicio no conoce getIO)
    try {
      const io = getIO()

      // A) Mover la tarjeta en el tablero de cocina
      io.emit('cocina:actualizar_tablero', pedidoActualizado)

      // B) Alerta "¡Listo!" hacia los meseros cuando el chef termina el pedido
      if (disparaAlertaListo) {
        console.log(
          ' [WEBSOCKET] Emitiendo alerta de listo a meseros para pedido:',
          pedidoActualizado._id.toString()
        )
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

    // 3. Respuesta HTTP
    res.status(200).json({
      mensaje: `Pedido movido a ${estado}`,
      pedido: agregarFechaBoliviaPedido(pedidoActualizado)
    })
  } catch (error) {
    const err = error as Error
    // El servicio lanza 'PEDIDO_NO_ENCONTRADO' cuando el ID no existe
    if (err.message === 'PEDIDO_NO_ENCONTRADO') {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }
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
      subtotalCierre,
      repartidorId,
      estado
    } = req.body

    const pedidoAnterior = await Pedido.findById(id)
    const updates: any = {}
    if (total !== undefined) updates.total = total
    if (detalles !== undefined) updates.detalles = detalles

    if (repartidorId !== undefined) updates.repartidorId = repartidorId
    if (estado !== undefined) updates.estado = estado

    // Solo reabrir el pedido a ABIERTO si se están agregando nuevos platos (detalles)
    if (
      pedidoAnterior &&
      pedidoAnterior.estado === ESTADOS_PEDIDO.ENTREGADO &&
      detalles !== undefined
    ) {
      updates.estado = ESTADOS_PEDIDO.ABIERTO
    }

    // Guardar los campos de la pre-cuenta en Pago (Separación de Pagos y Pedidos)
    const tieneCamposPago =
      clienteNombre !== undefined ||
      clienteCI !== undefined ||
      clienteNIT !== undefined ||
      cajeroAsignado !== undefined ||
      montoDescuento !== undefined ||
      montoPropina !== undefined ||
      subtotalCierre !== undefined

    if (tieneCamposPago || updates.estado === 'CERRADO') {
      let pago = await Pago.findOne({ pedido: id })
      if (!pago) {
        const pCode = `PAG-${String(id).slice(-6).toUpperCase()}`
        const oCode = pedidoAnterior?.codigo || `PED-${String(id).slice(-4).toUpperCase()}`
        pago = new Pago({
          codigoPago: pCode,
          codigoPedido: oCode,
          pedido: id,
          mesa: pedidoAnterior?.mesa || null,
          mesero: pedidoAnterior?.usuario || null,
          estadoPago: 'Pendiente',
          fechaEnvioCaja: obtenerFechaBolivia(),
          fechaEnvioCajaBolivia: formatearFechaBolivia(obtenerFechaBolivia())
        })
      }

      if (clienteNombre !== undefined) pago.nombreCliente = clienteNombre
      if (clienteCI !== undefined) pago.ci = clienteCI
      if (clienteNIT !== undefined) pago.nit = clienteNIT
      if (cajeroAsignado !== undefined) pago.cajero = cajeroAsignado
      if (montoDescuento !== undefined) pago.descuento = montoDescuento
      if (montoPropina !== undefined) pago.propina = montoPropina
      if (subtotalCierre !== undefined) pago.subtotal = subtotalCierre

      // Recalcular totalFinal
      const sub = subtotalCierre !== undefined ? subtotalCierre : (pago.subtotal || pedidoAnterior?.total || 0)
      const desc = montoDescuento !== undefined ? montoDescuento : (pago.descuento || 0)
      const prop = montoPropina !== undefined ? montoPropina : (pago.propina || 0)
      pago.totalFinal = sub - desc + prop

      if (updates.estado === 'CERRADO') {
        pago.estadoPago = 'Pagado'
        pago.fechaPago = obtenerFechaBolivia()
        pago.fechaPagoBolivia = formatearFechaBolivia(obtenerFechaBolivia())
      }

      await pago.save()
    }

    // Actualizamos los platos y el nuevo total del pedido existente
    const pedidoActualizado = await Pedido.findByIdAndUpdate(
      id,
      { $set: updates },
      { returnDocument: 'after' }
    )
      .populate('detalles.plato', 'nombre precio')
      .populate('mesa', 'numero')
      .populate('usuario', 'nombre apellido apellidos')

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

    // Obtener los datos del Pago para adjuntarlos dinámicamente al pedido retornado
    const pagoAsociado = await Pago.findOne({ pedido: pedidoActualizado._id })
    const pedidoConPago = typeof pedidoActualizado.toObject === 'function' ? pedidoActualizado.toObject() : pedidoActualizado
    if (pagoAsociado) {
      pedidoConPago.metodoPago = pagoAsociado.metodoPago
      pedidoConPago.montoDescuento = pagoAsociado.descuento
      pedidoConPago.montoPropina = pagoAsociado.propina
      pedidoConPago.subtotalCierre = pagoAsociado.subtotal
      pedidoConPago.clienteNombre = pagoAsociado.nombreCliente
      pedidoConPago.clienteCI = pagoAsociado.ci
      pedidoConPago.clienteNIT = pagoAsociado.nit
      pedidoConPago.cajeroAsignado = pagoAsociado.cajero
    }

    // Si el mesero asignó un cajero, emitimos el evento de nueva cuenta
    if (cajeroAsignado) {
      const payloadCaja = PedidoService.formatearPayloadCaja(pedidoConPago)

      try {
        const io = getIO()

        // Evento que ya existía en el backend
        io.emit('caja:nueva_cuenta', payloadCaja)

        // Evento sugerido por el documento del frontend
        io.emit('caja:solicitud_pago', payloadCaja)
      } catch (e) {}
    }

    res.status(200).json(agregarFechaBoliviaPedido(pedidoConPago))
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
      // SOLUCIÓN: En lugar de exigir 'ENTREGADO', aceptamos cualquier pedido activo
      estado: { $nin: [ESTADOS_PEDIDO.CERRADO, ESTADOS_PEDIDO.CANCELADO] },
      mesa: { $in: mesaIds }
    }

    if (cajero) {
      filtroPedidos.$or = [
        { cajeroAsignado: cajero },
        { cajeroAsignado: null },
        { cajeroAsignado: { $exists: false } }
      ]
    }

    // 2. Buscamos pedidos asociados a esas mesas
    const pedidos = await Pedido.find(filtroPedidos)
      .populate('mesa', 'numero estado')
      .populate('usuario', 'nombre apellido apellidos')
      .populate('detalles.plato', 'nombre precio')
      .sort({ updatedAt: -1 })

    // Buscar los pagos correspondientes (Separación de Pagos y Pedidos)
    const pedidoIds = pedidos.map((p) => p._id)
    const pagos = await Pago.find({ pedido: { $in: pedidoIds } })

    // 3. Formateamos la respuesta para que sea cómoda para el frontend
    const respuesta = pedidos.map((pedido: any) => {
      const pago = pagos.find((p) => p.pedido.toString() === pedido._id.toString())
      const pedObj = typeof pedido.toObject === 'function' ? pedido.toObject() : pedido
      if (pago) {
        pedObj.subtotalCierre = pago.subtotal
        pedObj.montoDescuento = pago.descuento
        pedObj.montoPropina = pago.propina
        pedObj.metodoPago = pago.metodoPago
        pedObj.clienteNombre = pago.nombreCliente
        pedObj.clienteCI = pago.ci
        pedObj.clienteNIT = pago.nit
        pedObj.cajeroAsignado = pago.cajero
      }
      return {
        ...PedidoService.formatearPayloadCaja(pedObj),
        fechaHoraBolivia: pedido.fechaHora ? formatearFechaBolivia(pedido.fechaHora) : undefined
      }
    })

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
    const id = req.params.id as string

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
      { returnDocument: 'after' }
    )

    if (!mesaActualizada) {
      res.status(404).json({ mensaje: 'Mesa no encontrada' })
      return
    }

    // Buscar o crear registro de Pago (Separación de Pagos y Pedidos)
    let pago = await Pago.findOne({ pedido: new mongoose.Types.ObjectId(id) })
    if (!pago) {
      pago = await Pago.create({
        codigoPago: `PAG-${String(id).slice(-6).toUpperCase()}`,
        codigoPedido: pedido.codigo,
        pedido: new mongoose.Types.ObjectId(id),
        mesa: pedido.mesa || undefined,
        mesero: pedido.usuario || undefined,
        subtotal: pedido.total || 0,
        totalFinal: pedido.total || 0,
        estadoPago: 'Pendiente',
        fechaEnvioCaja: obtenerFechaBolivia(),
        fechaEnvioCajaBolivia: formatearFechaBolivia(obtenerFechaBolivia())
      } as any)
    }

    const pedidoPoblado = await Pedido.findById(id)
      .populate('mesa', 'numero estado')
      .populate('usuario', 'nombre apellido apellidos')
      .populate('detalles.plato', 'nombre precio')

    if (!pedidoPoblado) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    const pedObj = typeof pedidoPoblado.toObject === 'function' ? pedidoPoblado.toObject() : pedidoPoblado
    if (pago) {
      pedObj.subtotalCierre = pago.subtotal
      pedObj.montoDescuento = pago.descuento
      pedObj.montoPropina = pago.propina
      pedObj.metodoPago = pago.metodoPago
      pedObj.clienteNombre = pago.nombreCliente
      pedObj.clienteCI = pago.ci
      pedObj.clienteNIT = pago.nit
      pedObj.cajeroAsignado = pago.cajero
    }

    const payload = PedidoService.formatearPayloadCaja(pedObj, mesaActualizada)

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

// <-- NUEVA FUNCIÓN: Checkout para Pedidos Delivery -->
export const checkoutPedido = async (req: CustomRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const {
      items,
      metodoPago,
      coordenadasEntrega,
      total,
      direccionEntrega,
      referenciaEntrega,
      costoDelivery,
      clienteTelefono,
      clienteNombre
    } = req.body

    if (!req.usuario?.id) {
      await session.abortTransaction()
      session.endSession()
      res.status(401).json({ success: false, mensaje: 'Usuario no autenticado' })
      return
    }

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction()
      session.endSession()
      res.status(400).json({ success: false, mensaje: 'El checkout requiere al menos un item.' })
      return
    }

    const lat = Number(coordenadasEntrega?.lat)
    const lng = Number(coordenadasEntrega?.lng)
    const coordenadasValidas =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat !== 0 &&
      lng !== 0 &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180

    if (!coordenadasValidas) {
      await session.abortTransaction()
      session.endSession()
      res.status(400).json({
        success: false,
        mensaje: 'Las coordenadas de entrega son obligatorias y deben ser validas.'
      })
      return
    }

    // 1. Verificacion y reserva de stock DENTRO de la transacción (lectura + escritura atómica).
    for (const item of items) {
      const cantidad = Number(item.cantidad)
      if (!cantidad || cantidad <= 0) {
        await session.abortTransaction()
        session.endSession()
        res
          .status(400)
          .json({ success: false, mensaje: 'Cada item debe tener una cantidad mayor a cero.' })
        return
      }

      const plato = await Plato.findById(item.platoId || item.plato).session(session)
      if (!plato || plato.stock < cantidad) {
        await session.abortTransaction()
        session.endSession()
        res.status(400).json({
          success: false,
          mensaje: `Stock insuficiente para el plato: ${plato?.nombre || 'Desconocido'}`
        })
        return
      }

      // Reservar stock atómicamente dentro de la sesión
      await Plato.findByIdAndUpdate(
        item.platoId || item.plato,
        { $inc: { stock: -cantidad } },
        { session }
      )
    }

    // 2. Generar documento del pedido cumpliendo las reglas del Schema IPedido.
    const pedidoId = new mongoose.Types.ObjectId()
    const fechaHora = obtenerFechaBolivia()

    const detallesFormateados = items.map((item: any) => ({
      plato: item.platoId || item.plato,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario || 0),
      subtotal: Number(item.precioUnitario || 0) * Number(item.cantidad),
      observacion: item.observacion || ''
    }))

    const totalVentas = total || detallesFormateados.reduce((acc: number, cur: any) => acc + cur.subtotal, 0)

    const nuevoPedido = new Pedido({
      _id: pedidoId,
      codigo: `PED-${String(pedidoId).slice(-4).toUpperCase()}`,
      usuario: req.usuario.id,
      usuarioModel: 'Cliente',
      metodoEntrega: 'delivery',
      detalles: detallesFormateados,
      total: totalVentas,
      estado: 'Pendiente_de_Aceptacion',
      coordenadasEntrega: { lat, lng },
      direccionEntrega,
      referenciaEntrega,
      costoDelivery,
      clienteTelefono,
      fechaHoraBolivia: formatearFechaBolivia(fechaHora),
      fechaHora
    })

    // 3. Guardar el pedido dentro de la transacción
    await nuevoPedido.save({ session })

    // 3.5 Crear el documento de Pago correspondiente (Separación de Pagos y Pedidos)
    await Pago.create(
      [
        {
          codigoPago: `PAG-${String(pedidoId).slice(-6).toUpperCase()}`,
          codigoPedido: nuevoPedido.codigo,
          pedido: pedidoId,
          mesa: undefined,
          mesero: undefined,
          nombreCliente: clienteNombre || 'Consumidor Final',
          subtotal: totalVentas,
          descuento: 0,
          propina: 0,
          totalFinal: totalVentas,
          metodoPago: metodoPago || 'Efectivo',
          estadoPago: 'Pendiente',
          fechaEnvioCaja: fechaHora,
          fechaEnvioCajaBolivia: formatearFechaBolivia(fechaHora)
        } as any
      ],
      { session }
    )

    // 4. Confirmar todos los cambios de forma atómica
    await session.commitTransaction()
    session.endSession()

    // 5. Asignar repartidor DESPUÉS del commit (operación independiente, no crítica para la atomicidad)
    const pedidoAsignado = await asignarRepartidorDisponible(String(nuevoPedido._id))
    const pedidoRespuesta = pedidoAsignado || nuevoPedido

    try {
      const io = getIO()
      io.emit('delivery:nuevo_pedido', pedidoRespuesta)
      if (pedidoAsignado?.repartidorId) {
        io.emit('delivery:pedido_asignado', pedidoAsignado)
      }
    } catch (socketError) {
      console.warn('Checkout delivery creado, pero fallo la notificacion en tiempo real')
    }

    const resPedido = agregarFechaBoliviaPedido(pedidoRespuesta)
    resPedido.metodoPago = metodoPago || 'Efectivo'
    resPedido.clienteNombre = clienteNombre || 'Consumidor Final'

    res.status(201).json({
      success: true,
      pedido: resPedido,
      asignado: Boolean(pedidoAsignado)
    })
  } catch (error) {
    // Revertir TODOS los cambios: stock de platos y pedido se deshacen juntos
    await session.abortTransaction()
    session.endSession()
    const err = error as Error
    res
      .status(500)
      .json({ success: false, mensaje: 'Error procesando checkout', error: err.message })
  }
}
