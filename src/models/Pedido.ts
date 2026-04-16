import mongoose, { Schema, Document } from 'mongoose'

// 1. Interfaz y Esquema para el Detalle (Lo que va adentro del pedido)
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
    observacion: { type: String, default: '' } // Ej: "Sin cebolla"
  },
  { _id: false }
) // No necesitamos un ID extra para cada platillo en la lista

// 2. Interfaz y Esquema para el Pedido principal
export interface IPedido extends Document {
  fechaHora: Date
  estado: string
  total: number
  mesa?: mongoose.Types.ObjectId // Opcional (porque un Delivery no tiene mesa)
  usuario: mongoose.Types.ObjectId // El mesero o cajero que lo creó
  detalles: IDetallePedido[] // Array de detalles
  qrUrl?: string
}

const PedidoSchema = new Schema(
  {
    fechaHora: { type: Date, default: Date.now },
    estado: {
      type: String,
      enum: ['ABIERTO', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO', 'CERRADO'],
      default: 'ABIERTO'
    },
    total: { type: Number, required: true, default: 0 },
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: false },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },

    detalles: [DetallePedidoSchema],// ¡Aquí incrustamos los detalles directamente!
    qrUrl: { type: String, required: false },
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IPedido>('Pedido', PedidoSchema)
