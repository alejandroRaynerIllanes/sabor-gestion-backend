import mongoose, { Schema, Document } from 'mongoose'

export interface IUbicacion extends Document {
  nombre: string
  descripcion?: string
}

const UbicacionSchema = new Schema(
  {
    nombre: { type: String, required: true, unique: true, trim: true },
    descripcion: { type: String, default: '' }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IUbicacion>('Ubicacion', UbicacionSchema)
