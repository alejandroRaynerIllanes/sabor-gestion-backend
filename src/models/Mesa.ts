import mongoose, { Schema, Document } from 'mongoose';

export interface IMesa extends Document {
  numero: string;
  capacidad: number;
  ubicacion: mongoose.Types.ObjectId;
  tipo: string;
  estado: string;
}

const MesaSchema = new Schema(
  {
    numero: { type: String, required: true, trim: true },
    capacidad: { type: Number, required: true, min: 1, max: 20 },
    ubicacion: { type: Schema.Types.ObjectId, ref: 'Ubicacion', required: true },
    tipo: { type: String, enum: ['normal', 'vip'], default: 'normal' },
    estado: { type: String, enum: ['Disponible', 'Ocupada', 'Reservada'], default: 'Disponible' }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export default mongoose.model<IMesa>('Mesa', MesaSchema);