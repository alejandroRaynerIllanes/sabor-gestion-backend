// src/models/Pedido.ts
import mongoose, { Schema, Document } from 'mongoose'

// 1. Interfaz y Esquema para el Detalle
export interface IDetallePedido {
  plato: mongoose.Types.ObjectId
  cantidad: number
  precioUnitario: number
  subtotal: number
  observacion: string
}

const DetallePedidoSchema = new Schema<IDetallePedido>(
  {
    plato: { type: Schema.Types.ObjectId, ref: 'Plato', required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precioUnitario: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    observacion: { type: String, default: '' }
  },
  { _id: false }
)

// 2. Interfaz y Esquema para el Pedido principal
export interface IPedido extends Document {
  codigo?: string
  fechaHora: Date
  estado: string
  total: number
  mesa?: mongoose.Types.ObjectId
  usuario: mongoose.Types.ObjectId
  detalles: IDetallePedido[]
  qrUrl?: string
  // Campos para el cierre de caja y comprobante
  metodoPago?: string
  montoDescuento?: number
  montoPropina?: number
  subtotalCierre?: number
}

const PedidoSchema = new Schema(
  {
    codigo: { type: String, unique: true },
    fechaHora: { type: Date, default: Date.now },
    estado: {
      type: String,
      enum: ['ABIERTO', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO', 'CERRADO'],
      default: 'ABIERTO'
    },
    total: { type: Number, required: true, default: 0 },
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: false },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    detalles: [DetallePedidoSchema],
    qrUrl: { type: String, required: false },

    // Información del pago final (Texto plano para simulación)
    metodoPago: { 
      type: String, 
      enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'QR', 'Otro'],
      required: false 
    },
    montoDescuento: { type: Number, default: 0 },
    montoPropina: { type: Number, default: 0 },
    subtotalCierre: { type: Number, default: 0 } // Total antes de descuentos/propinas
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IPedido>('Pedido', PedidoSchema)