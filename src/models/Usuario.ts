import mongoose, { Schema, Document } from 'mongoose'

export interface IUsuario extends Document {
  nombre: string
  apellido: string
  email: string
  password: string // Se guardará encriptada (hasheada)
  rol: string
}

const UsuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    rol: {
      type: String,
      enum: ['Administrador', 'Mesero', 'Cocinero', 'Cajero'], // Los roles exactos del RF-06
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

export default mongoose.model<IUsuario>('Usuario', UsuarioSchema)
