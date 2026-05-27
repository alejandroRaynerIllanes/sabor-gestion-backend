// src/controllers/pago.controller.ts
import { Request, Response } from 'express'
import Pedido from '../models/Pedido'
import Mesa from '../models/Mesa'
import { getIO } from '../socket/socket'
import nodemailer from 'nodemailer'
import Reserva from '../models/Reserva'
import Pago from '../models/Pago'
import { obtenerFechaBolivia, formatearFechaBolivia } from '../utils/fechaBolivia'
// 1. Generador de QR (Se mantiene para cuando eligen método QR estático)
export const generarPagoQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params
    const pedido = await Pedido.findById(pedidoId)

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    const datosPago = `SABOR_GESTION_ID_${pedido._id}_TOTAL_${pedido.total}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${datosPago}`

    pedido.qrUrl = qrUrl
    await pedido.save()

    res.json({ qrUrl, total: pedido.total })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al generar QR' })
  }
}

// 2. Procesamiento de Pago Final (Conectado a tu Modal)
export const procesarPagoFinal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params

    const { metodoPago, porcentajeDescuento = 0, porcentajePropina = 0 } = req.body

    // Hacemos populate del usuario (Mesero) para saber quién tomó la orden
    const pedido = await Pedido.findById(pedidoId).populate('usuario', 'nombre apellido')

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    if (pedido.estado === 'CERRADO') {
      res.status(400).json({ mensaje: 'Este pedido ya ha sido pagado y cerrado.' })
      return
    }

    // RESTRICCIÓN FLEXIBILIZADA: Evitamos que el cajero se quede bloqueado si el chef olvidó marcar "Listo"
    // Solo evitamos cobrar pedidos que ya estén Cancelados.
    if (pedido.estado === 'CANCELADO') {
      res.status(400).json({ mensaje: 'No se puede cobrar un pedido cancelado.' })
      return
    }

    if (!['Efectivo', 'Tarjeta', 'QR'].includes(metodoPago)) {
      res.status(400).json({ mensaje: 'Método de pago no permitido. Use Efectivo, Tarjeta o QR.' })
      return
    }

    const ped: any = pedido
    const subtotal = ped.subtotalCierre || pedido.total || 0
    
    // 🛠️ BUG FIX: Calcular los montos reales si el frontend envió porcentajes en el momento del pago
    const montoDescuento = porcentajeDescuento > 0 
      ? (subtotal * (porcentajeDescuento / 100)) 
      : (ped.montoDescuento || 0)
      
    const montoPropina = porcentajePropina > 0 
      ? (subtotal * (porcentajePropina / 100)) 
      : (ped.montoPropina || 0)
      
    const totalFinal = subtotal - montoDescuento + montoPropina

    pedido.estado = 'CERRADO'
    pedido.total = totalFinal

    ped.metodoPago = metodoPago
    ped.montoDescuento = montoDescuento
    ped.montoPropina = montoPropina
    ped.subtotalCierre = subtotal

    await pedido.save()

    const fechaEnvioCaja = obtenerFechaBolivia()
    const fechaPago = obtenerFechaBolivia()
    const momentoExacto = obtenerFechaBolivia();

    // 1. SINCRONIZACIÓN OFICIAL EN LA COLECCIÓN "PAGOS"
    // Separamos la lógica contable y creamos el registro financiero puro
    const nuevoPago = new Pago({
      codigoPago: `PAG-${String(pedido._id).slice(-6).toUpperCase()}`,
      pedido: pedido._id,
      mesa: pedido.mesa,
      mesero: (pedido.usuario as any)?._id || pedido.usuario,
      cajero: (req as any).usuario?.id || ped.cajeroAsignado || null,
      nombreCliente: ped.clienteNombre || 'Consumidor Final',
      ci: ped.clienteCI || '',
      nit: ped.clienteNIT || '',
      subtotal: subtotal,
      descuento: montoDescuento,
      propina: montoPropina,
      totalFinal: totalFinal,
      metodoPago: metodoPago,
      estadoPago: 'Pagado',
      fechaEnvioCajaBolivia: formatearFechaBolivia(momentoExacto),
      fechaEnvioCaja: momentoExacto,
      fechaPagoBolivia: formatearFechaBolivia(momentoExacto),
      fechaPago: momentoExacto
    })
    await nuevoPago.save()

    let nuevoEstado = 'Libre'
    if (pedido.mesa) {
      const inicioHoy = new Date()
      inicioHoy.setHours(0, 0, 0, 0)
      const reservasPendientes = await Reserva.countDocuments({
        mesa: pedido.mesa,
        fecha: { $gte: inicioHoy }
      })
      nuevoEstado = reservasPendientes > 0 ? 'Reservada' : 'Libre'
      await Mesa.findByIdAndUpdate(pedido.mesa, { estado: nuevoEstado })
    }

    try {
      const io = getIO()
      io.emit('cocina:actualizar_tablero', pedido)

      if (pedido.mesa) {
        const mesaLiberada = await Mesa.findById(pedido.mesa)
        io.emit('mesas:updated', {
          id: pedido.mesa.toString(),
          status: nuevoEstado === 'Libre' ? 'Disponible' : 'Reservada',
          name: mesaLiberada?.numero || 'Mesa'
        })
        io.emit('mesas:pago_completado', {
          mesaId: pedido.mesa.toString(),
          mesaNombre: mesaLiberada?.numero || 'Mesa',
          pedidoId: pedido._id.toString(),
          mensaje: 'Pago procesado exitosamente'
        })
      }
    } catch (socketError) {
      console.warn('Pago guardado, pero falló la emisión del WebSocket:', socketError)
    }

    // Extraemos el nombre real del mesero
    const meseroNombre = pedido.usuario
      ? `${(pedido.usuario as any).nombre || ''} ${(pedido.usuario as any).apellido || ''}`.trim()
      : 'Sin mesero'

    const fechaComprobante = obtenerFechaBolivia()

    res.status(200).json({
      mensaje: 'Pago procesado exitosamente',
      comprobante: {
        pedidoId: pedido._id,
        meseroNombre: meseroNombre, // <-- AHORA SÍ VIAJA EL NOMBRE DEL MESERO AL FRONTEND
        subtotal: subtotal,
        descuentoAplicado: montoDescuento,
        propinaAplicada: montoPropina,
        totalPagado: totalFinal,
        metodoPago: ped.metodoPago,
        fechaBolivia: formatearFechaBolivia(fechaComprobante),
        fecha: fechaComprobante
      }
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({ mensaje: 'Error al procesar el pago', error: err.message })
  }
}

// 3. NUEVO: Simulador de Pago desde Celular (QR Dinámico)
export const simularPagoQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params

    // Emitimos el WebSocket avisando a la Caja que alguien acaba de pagar por QR
    try {
      const io = getIO()
      io.emit('caja:pago_confirmado', {
        pedidoId,
        mensaje: 'Transferencia QR recibida',
        fecha: obtenerFechaBolivia()
      })
    } catch (socketError) {
      console.warn('Falló la emisión del WebSocket de simulación:', socketError)
    }

    res.status(200).json({
      exito: true,
      mensaje: 'Simulación de pago exitosa. Notificando a la caja...'
    })
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al simular el pago' })
  }
}
// 4. NUEVO: Enviar recibo detallado por correo electrónico
export const enviarReciboCorreo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pedidoId } = req.params
    // AHORA RECIBIMOS LOS DATOS DESDE EL FRONTEND
    const { email, clienteNombre, clienteCI } = req.body

    if (!email) {
      res.status(400).json({ mensaje: 'Debe proporcionar un correo electrónico' })
      return
    }

    const pedido = await Pedido.findById(pedidoId)
      .populate('usuario', 'nombre apellido')
      .populate('mesa')
      .populate('detalles.plato', 'nombre precio')

    if (!pedido) {
      res.status(404).json({ mensaje: 'Pedido no encontrado' })
      return
    }

    const ped: any = pedido
    const codigo = ped.codigo || `PED-${String(ped._id).slice(-4).toUpperCase()}`
    const subtotal = ped.subtotalCierre || ped.total || 0
    const descuento = ped.montoDescuento || 0
    const propina = ped.montoPropina || 0
    const totalFinal = subtotal - descuento + propina

    const mesaNombre = ped.mesa?.numero || 'Barra'
    const meseroNombre = ped.usuario
      ? `${ped.usuario.nombre} ${ped.usuario.apellido || ''}`.trim()
      : 'Mesero'
    const fecha = new Date().toLocaleString('es-BO')

    // USAMOS LOS DATOS QUE NOS MANDÓ LA PANTALLA (o valores por defecto si fallan)
    const finalClienteNombre = clienteNombre || ped.clienteNombre || 'Consumidor Final'
    const finalClienteCI = clienteCI || ped.clienteCI || ped.clienteNIT || 'S/N'

    // 1. Armamos las filas de la tabla de consumo dinámicamente
    let itemsHtml = ''
    const detalles = ped.detalles || ped.items || []

    detalles.forEach((item: any) => {
      const nombre = item.nombre || item.plato?.nombre || 'Plato'
      const cantidad = item.cantidad || 1
      const pu = (item.precioUnitario || item.plato?.precio || 0).toFixed(2)
      const subt = (item.subtotal || parseFloat(pu) * cantidad).toFixed(2)

      itemsHtml += `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;">${cantidad}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;">${nombre}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${pu}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">${subt}</td>
        </tr>
      `
    })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // No fallar en certificados inválidos en servidores de Render
        rejectUnauthorized: false
      }
    })

    // 2. Diseño del Ticket estilo "Impresora"
    const mailOptions = {
      from: `"Sabor & Gestión" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Comprobante de Pago - ${codigo}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 420px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #374151; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4B2E2D; margin: 0; font-size: 24px; font-weight: 900;">SABOR & GESTIÓN</h2>
            <p style="margin: 5px 0 0 0; color: #6B7280; font-size: 14px;">Comprobante de Pago</p>
            <p style="margin: 5px 0 0 0; font-weight: bold; color: #D96C4A;">Pedido: ${codigo}</p>
          </div>

          <div style="font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
            <p style="margin: 0;"><strong>Mesa:</strong> ${mesaNombre}</p>
            <p style="margin: 0;"><strong>Mesero:</strong> ${meseroNombre}</p>
            <p style="margin: 0;"><strong>Cliente:</strong> ${finalClienteNombre}</p>
            <p style="margin: 0;"><strong>CI/NIT:</strong> ${finalClienteCI}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="text-align: left; padding-bottom: 8px; color: #9CA3AF; font-size: 11px; text-transform: uppercase;">Cant</th>
                <th style="text-align: left; padding-bottom: 8px; color: #9CA3AF; font-size: 11px; text-transform: uppercase;">Descripción</th>
                <th style="text-align: right; padding-bottom: 8px; color: #9CA3AF; font-size: 11px; text-transform: uppercase;">P.U</th>
                <th style="text-align: right; padding-bottom: 8px; color: #9CA3AF; font-size: 11px; text-transform: uppercase;">Subt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; font-size: 13px; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 15px;">
            <p style="margin: 3px 0;">Subtotal: <span style="display: inline-block; width: 80px;">Bs. ${subtotal.toFixed(2)}</span></p>
            ${descuento > 0 ? `<p style="margin: 3px 0; color: #059669;">Descuento: <span style="display: inline-block; width: 80px;">- Bs. ${descuento.toFixed(2)}</span></p>` : ''}
            ${propina > 0 ? `<p style="margin: 3px 0; color: #D96C4A;">Propina: <span style="display: inline-block; width: 80px;">+ Bs. ${propina.toFixed(2)}</span></p>` : ''}
            <h3 style="margin: 10px 0 0 0; color: #111827; font-size: 18px;">TOTAL FINAL: <span style="display: inline-block; width: 100px;">Bs. ${totalFinal.toFixed(2)}</span></h3>
          </div>

          <div style="font-size: 12px; color: #6B7280; text-align: center;">
            <p style="margin: 2px 0;"><strong>Método de Pago:</strong> ${ped.metodoPago || 'Efectivo'}</p>
            <p style="margin: 2px 0;"><strong>Fecha:</strong> ${fecha}</p>
            <br/>
            <p style="margin: 0; font-weight: bold; color: #4B2E2D; font-size: 14px;">¡Gracias por su preferencia!</p>
          </div>

        </div>
      `
    }

    await transporter.sendMail(mailOptions)

    res.status(200).json({ mensaje: 'Recibo enviado por correo exitosamente' })
  } catch (error) {
    console.error('Error al enviar correo:', error)
    res.status(500).json({ mensaje: 'Error al enviar el correo' })
  }
}
