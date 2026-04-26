//src/models/Usuario.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IUsuario extends Document {
  nombre: string
  apellido: string
  ci: string // <-- Nuevo campo
  email: string
  password: string
  rol: string
  estado: boolean // <-- Es buena práctica tenerlo en el modelo
}

const UsuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    ci: { type: String, required: true, unique: true, trim: true }, // <-- Único y requerido
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    rol: {
      type: String,
      enum: ['Administrador', 'Mesero', 'Cocinero', 'Cajero', 'Cliente'],
      required: true
    },
    estado: { type: Boolean, default: true } // Por defecto un usuario nuevo está activo
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IUsuario>('Usuario', UsuarioSchema)
