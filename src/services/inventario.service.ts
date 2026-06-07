//src/services/inventario.service.ts
import mongoose from 'mongoose'
import Pedido from '../models/Pedido'
import Receta from '../models/Receta'
import Ingrediente, { IIngrediente } from '../models/Ingrediente'
import MovimientoInventario from '../models/MovimientoInventario'
import AlertaStock from '../models/AlertaStock'
import { getIO } from '../socket/socket'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Calcula el estado del ingrediente según sus niveles de stock.
 */
function calcularEstado(stockActual: number, stockMinimo: number): IIngrediente['estado'] {
  if (stockActual <= 0) return 'Agotado'
  if (stockActual <= stockMinimo) return 'Bajo'
  return 'Disponible'
}

/**
 * Determina si un ingrediente debe excluirse del descuento
 * basándose en la observación del detalle del pedido.
 * Ejemplo: observacion = "Sin Cebolla" y nombreIngrediente = "Cebolla" → true (excluir)
 */
function debeExcluirIngrediente(observacion: string, nombreIngrediente: string): boolean {
  if (!observacion) return false
  const regex = new RegExp(`(?:sin|no\\s+poner|quitar|evitar)\\s+${nombreIngrediente.trim()}`, 'i')
  return regex.test(observacion)
}

/**
 * Verifica si ya existe una AlertaStock activa ('Pendiente') para este ingrediente
 * registrada en el día de hoy, para evitar duplicados.
 */
async function existeAlertaHoy(ingredienteId: mongoose.Types.ObjectId): Promise<boolean> {
  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)

  const finDia = new Date()
  finDia.setHours(23, 59, 59, 999)

  const alerta = await AlertaStock.findOne({
    ingrediente: ingredienteId,
    estado: 'Pendiente',
    fecha: { $gte: inicioDia, $lte: finDia }
  })

  return alerta !== null
}

// ─── Servicio principal ──────────────────────────────────────────────────────

/**
 * Procesa el descuento inteligente de inventario al cerrar un pedido.
 *
 * Por cada plato del pedido:
 *  1. Busca la Receta asociada al plato.
 *  2. Para cada ingrediente de la receta, verifica si la observación lo excluye.
 *  3. Si no está excluido, descuenta (cantidadNecesaria × cantidadPlatos) del stock.
 *  4. Actualiza el estado del Ingrediente.
 *  5. Registra un MovimientoInventario de tipo 'Salida'.
 *  6. Si el stock queda bajo el mínimo, genera una AlertaStock (sin duplicar por día).
 */
export async function procesarDescuentoPedido(pedidoId: string): Promise<void> {
  // 1. Buscar el pedido con sus platos populados
  const pedido = await Pedido.findById(pedidoId).populate('detalles.plato', 'nombre')

  if (!pedido) {
    throw new Error(`Pedido no encontrado: ${pedidoId}`)
  }

  if (!pedido.detalles || pedido.detalles.length === 0) {
    console.warn(`[Inventario] Pedido ${pedidoId} no tiene detalles. Sin descuento.`)
    return
  }

  // 2. Iterar por cada plato del pedido
  for (const detalle of pedido.detalles) {
    const platoId = detalle.plato as unknown as mongoose.Types.ObjectId
    const cantidadPlatos = detalle.cantidad
    const observacion = detalle.observacion || ''

    // 3. Buscar la receta del plato, populando el nombre del ingrediente
    const receta = await Receta.findOne({ plato: platoId }).populate(
      'ingredientes.ingrediente',
      'nombre stockActual stockMinimo'
    )

    if (!receta || receta.ingredientes.length === 0) {
      // Plato sin receta registrada → omitir descuento para este plato
      continue
    }

    // 4. Iterar por cada ingrediente de la receta
    for (const item of receta.ingredientes) {
      const ingredienteDoc = item.ingrediente as unknown as IIngrediente & {
        _id: mongoose.Types.ObjectId
      }

      if (!ingredienteDoc || !ingredienteDoc.nombre) {
        // Ingrediente no encontrado (referencia rota) → omitir
        continue
      }

      // 5. Verificar exclusión por observación ("Sin X")
      if (debeExcluirIngrediente(observacion, ingredienteDoc.nombre)) {
        console.log(
          `[Inventario] Ingrediente "${ingredienteDoc.nombre}" excluido por observación: "${observacion}"`
        )
        continue
      }

      // 6. Calcular cantidad a descontar
      const cantidadADescontar = item.cantidadNecesaria * cantidadPlatos

      // 7. Obtener el documento real del ingrediente para actualizar su stock
      const ingrediente = await Ingrediente.findById(ingredienteDoc._id)
      if (!ingrediente) continue

      const stockAnterior = ingrediente.stockActual
      const nuevoStock = Math.max(0, stockAnterior - cantidadADescontar)
      const nuevoEstado = calcularEstado(nuevoStock, ingrediente.stockMinimo)

      // 8. Persistir la actualización del stock y estado
      ingrediente.stockActual = nuevoStock
      ingrediente.estado = nuevoEstado
      await ingrediente.save()

      console.log(
        `[Inventario] "${ingrediente.nombre}": ${stockAnterior} → ${nuevoStock} (${nuevoEstado})`
      )

      // 9. Registrar movimiento de inventario tipo 'Salida'
      await MovimientoInventario.create({
        ingrediente: ingrediente._id,
        tipoMovimiento: 'Salida',
        cantidad: cantidadADescontar,
        descripcion: `Consumo por pedido ${pedido.codigo || pedidoId}`
      })

      // 10. Generar AlertaStock si el stock bajó del mínimo (sin duplicar alertas del día)
      if (nuevoStock <= ingrediente.stockMinimo) {
        const yaAlertado = await existeAlertaHoy(ingrediente._id as mongoose.Types.ObjectId)

        if (!yaAlertado) {
          const alertaGenerada = await AlertaStock.create({
            ingrediente: ingrediente._id,
            stockActual: nuevoStock,
            stockMinimo: ingrediente.stockMinimo,
            estado: 'Pendiente'
          })

          console.warn(
            `[Inventario] ⚠️ Alerta generada: "${ingrediente.nombre}" está en estado "${nuevoEstado}" (stock: ${nuevoStock})`
          )

          try {
            const io = getIO()
            io.emit('inventario:alerta', alertaGenerada)
          } catch (socketError) {
            console.warn('[Inventario] Alerta creada, pero falló la emisión del WebSocket:', socketError)
          }
        }
      }
    }
  }

  console.log(`[Inventario] ✅ Descuento completado para pedido ${pedidoId}`)
}
