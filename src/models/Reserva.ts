//src/models/Reserva.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IReserva extends Document {
  codigo: string
  pedidoId: string
  fecha: Date
  hora: string
  clienteNombre: string
  cantidadPersonas: number
  vip: boolean
  mesa: mongoose.Types.ObjectId // Relación con la Mesa
  usuario: mongoose.Types.ObjectId // Relación con el Usuario que hizo/registró la reserva
  createdAt: Date
  updatedAt: Date
}

const ReservaSchema = new Schema(
  {
    codigo: { type: String, unique: true, required: true },
    pedidoId: { type: String, required: true, unique: true },
    fecha: { type: Date, required: true },
    hora: { type: String, required: true },
    clienteNombre: { type: String, required: true, trim: true },
    cantidadPersonas: { type: Number, required: true, min: 1 },
    vip: { type: Boolean, default: false },
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IReserva>('Reserva', ReservaSchema)