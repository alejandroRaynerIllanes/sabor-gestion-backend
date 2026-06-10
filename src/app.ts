//src/app.ts
import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path' // <-- Por si necesitas servir imágenes

// 1. Importamos las rutas
import authRoutes from './routes/auth.routes'
import usuarioRoutes from './routes/usuario.routes'
import categoriaRoutes from './routes/categoria.routes'
import mesaRoutes from './routes/mesa.routes'
import ubicacionRoutes from './routes/ubicacion.routes'
import platoRoutes from './routes/plato.routes'
import reservaRoutes from './routes/reserva.routes'
import pedidoRoutes from './routes/pedido.routes'
import pagoRoutes from './routes/pago.routes'
import dashboardRoutes from './routes/dashboard.routes'
import uploadRouters from './routes/upload.routes' // <-- Sin el .js
import inventarioRoutes from './routes/inventario.routes'

import swaggerUi from 'swagger-ui-express'
import { swaggerSpec, swaggerUiOptions } from './configs/swagger'
import deliveryRoutes from './routes/delivery.routes'
import direccionRoutes from './routes/direccion.routes'

const app: Application = express()


// Middlewares globales
app.use(morgan('dev'))
// Localización: src/app.ts
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://quirquinita.onrender.com', // <-- Reemplaza la URL vieja por esta
      'https://tis-pied.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos (Descomenta esto si guardas imágenes localmente en una carpeta 'uploads')
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Rutas
app.use('/api/upload', uploadRouters)
app.use('/api/auth', authRoutes)
app.use('/api/usuarios', usuarioRoutes)
app.use('/api/categorias', categoriaRoutes)
app.use('/api/mesas', mesaRoutes)
app.use('/api/ubicaciones', ubicacionRoutes)
app.use('/api/platos', platoRoutes)
app.use('/api/reservas', reservaRoutes)
app.use('/api/pedidos', pedidoRoutes)
app.use('/api/pagos', pagoRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/inventario', inventarioRoutes)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions as any))

app.use('/api/delivery', deliveryRoutes)
app.use('/api/direcciones', direccionRoutes)
// Health check / Ruta de prueba
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'API de Sabor & Gestión funcionando correctamente 🚀'
  })
})
// Agrega esto en tu app.ts o server.ts
app.get('/mapa-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Mapa de Pruebas Delivery</title>
      <script src="/socket.io/socket.io.js"></script>
      <style>
        body { margin: 0; font-family: sans-serif; }
        #map { width: 100%; height: 100vh; background: #e5e5e5; display: flex; align-items: center; justify-content: center; }
        .info { position: absolute; top: 10px; left: 10px; background: white; padding: 10px; border-radius: 5px; border: 2px solid #000; z-index: 1000;}
      </style>
    </head>
    <body>
      <div class="info">
        <b>ID Pedido:</b> <input type="text" id="orderId" placeholder="Pega el ID aquí">
        <button onclick="conectar()">Rastrear Moto</button>
        <p id="status">Esperando conexión...</p>
      </div>
      
      <div id="map">
        <h2>El mapa MapCN se renderizará aquí</h2>
        </div>

      <script>
        const socket = io('http://localhost:3000'); // Conexión a tu WebSocket local
        
        function conectar() {
          const orderId = document.getElementById('orderId').value;
          if(!orderId) return alert("Pon un ID de pedido primero");
          
          document.getElementById('status').innerText = "Conectado a la sala: " + orderId;
          
          // 1. Nos unimos a la sala privada de este pedido
          socket.emit('join_order_room', orderId);
          
          // 2. Escuchamos los movimientos del repartidor
          socket.on('delivery_update', (coordenadas) => {
            console.log("¡La moto se movió!", coordenadas);
            document.getElementById('status').innerText = "📍 Moto en: Lat " + coordenadas.lat + " / Lng " + coordenadas.lng;
            
            // AQUÍ: Código de MapCN para mover el ícono en la pantalla usando 'coordenadas.lat' y 'coordenadas.lng'
          });
        }
      </script>
    </body>
    </html>
  `);
});

export default app
