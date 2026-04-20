//src/models/Plato.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IPlato extends Document {
  nombre: string
  descripcion: string
  precio: number
  imagenUrl: string
  disponible: boolean
  categoria: mongoose.Types.ObjectId // Relación (1 a muchos) con Categoria
}

const PlatoSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true, min: 0 },
    imagenUrl: { type: String, default: '' },
    disponible: { type: Boolean, default: true },
    categoria: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IPlato>('Plato', PlatoSchema)
