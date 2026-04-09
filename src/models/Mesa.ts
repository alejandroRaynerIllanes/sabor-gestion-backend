import mongoose, { Schema, Document } from 'mongoose'

export interface IMesa extends Document {
  numero: string
  capacidad: number
  ubicacion: string
  estado: string
}

const MesaSchema = new Schema(
  {
    numero: { type: String, required: true, unique: true }, // Ej: "M1", "M2"
    capacidad: { type: Number, required: true, min: 1 },
    ubicacion: { type: String, default: 'Salón Principal' },
    estado: {
      type: String,
      enum: ['Libre', 'Ocupada', 'Reservada', 'Cuenta Solicitada'], // Fusionamos tu diagrama con el RF-04
      default: 'Libre'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IMesa>('Mesa', MesaSchema)
