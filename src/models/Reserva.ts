import mongoose, { Schema, Document } from 'mongoose'

export interface IReserva extends Document {
  fecha: Date
  hora: string
  mesa: mongoose.Types.ObjectId // Relación con la Mesa
  usuario: mongoose.Types.ObjectId // Relación con el Usuario que hizo/registró la reserva
}

const ReservaSchema = new Schema(
  {
    fecha: { type: Date, required: true },
    hora: { type: String, required: true }, // Ej: "19:30"
    mesa: { type: Schema.Types.ObjectId, ref: 'Mesa', required: true },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IReserva>('Reserva', ReservaSchema)
