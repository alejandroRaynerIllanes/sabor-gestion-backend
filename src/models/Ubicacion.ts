import mongoose, { Schema, Document } from 'mongoose';

export interface IUbicacion extends Document {
  nombre: string;
}

const UbicacionSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default mongoose.model<IUbicacion>('Ubicacion', UbicacionSchema);