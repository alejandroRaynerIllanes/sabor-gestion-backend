import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

dotenv.config()

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!)
    console.log('🟢 Conectado a Atlas para seeding...')

    const db = mongoose.connection.db!

    // ── Categorías ──────────────────────────────────────────
    const categorias = db.collection('categorias')
    await categorias.deleteMany({}) // limpia antes de insertar
    await categorias.insertMany([
      {
        nombre: 'Entradas',
        descripcion: 'Platos de entrada',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Sopas',
        descripcion: 'Sopas y cremas',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Segundos',
        descripcion: 'Platos principales',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Postres',
        descripcion: 'Postres y dulces',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Bebidas',
        descripcion: 'Bebidas frías y calientes',
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
    console.log('✅ 5 categorías insertadas')

    // ── Usuario Administrador ────────────────────────────────
    const usuarios = db.collection('usuarios')
    await usuarios.deleteMany({ email: 'admin@sabor.com' })
    const passwordHasheada = await bcrypt.hash('12345678', 10)
    await usuarios.insertOne({
      nombre: 'Administrador',
      email: 'admin@sabor.com',
      password: passwordHasheada,
      rol: 'Administrador',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    console.log('✅ Usuario Administrador insertado')

    console.log('🌱 Seeding completado exitosamente')
    process.exit(0)
  } catch (error) {
    console.error('🔴 Error en seeding:', error)
    process.exit(1)
  }
}

seed()
