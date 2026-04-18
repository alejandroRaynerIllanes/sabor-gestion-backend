//src/models/Usuario.ts
import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUsuario extends Document {
  nombre: string
  email: string
  password: string
  rol: string
  activo: boolean
}

const UsuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    rol: {
      type: String,
      enum: ['Administrador', 'Mesero', 'Cocinero', 'Cajero'],
      required: true
    },
    activo: { type: Boolean, default: true }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

UsuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

export default mongoose.model<IUsuario>('Usuario', UsuarioSchema)
