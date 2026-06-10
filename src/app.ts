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
// Reemplaza este bloque exacto en tu src/app.ts
app.get('/mapa-test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Mapa de Pruebas Delivery</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="/socket.io/socket.io.js"></script>
      <style>
        body { margin: 0; font-family: sans-serif; }
        #map { width: 100%; height: 100vh; background: #e5e5e5; }
        .info { position: absolute; top: 10px; left: 10px; background: white; padding: 15px; border-radius: 8px; border: 2px solid #111; z-index: 1000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);}
        input { padding: 5px; width: 180px; margin-right: 5px; }
        button { padding: 5px 10px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { background: #218838; }
      </style>
    </head>
    <body>
      <div class="info">
        <b style="display:block; margin-bottom:5px;">Rastreador GPS en Vivo</b>
        <b>ID Pedido:</b> <input type="text" id="orderId" placeholder="Pega el ID fresco aquí">
        <button onclick="conectar()">Rastrear</button>
        <p id="status" style="margin: 8px 0 0 0; color: #555;">Esperando conexión...</p>
      </div>
      
      <div id="map"></div>

      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const socket = io('http://localhost:3000'); 
        let mapaObj = L.map('map').setView([-17.3935, -66.1570], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapaObj);
        
        let marcadorMoto;
        let marcadorCliente;
        let marcadorRestaurante;

        async function conectar() {
          const orderId = document.getElementById('orderId').value.trim();
          if(!orderId) return alert("Por favor, introduce el ID del nuevo pedido primero");
          
          document.getElementById('status').innerText = "Cargando ruta desde la base de datos...";
          
          try {
            // 1. OBTENER COORDENADAS INICIALES DEL BACKEND
            const response = await fetch('/api/delivery/map/' + orderId);
            const data = await response.json();

            if (!data.success) {
              document.getElementById('status').innerText = "Error: " + data.mensaje;
              document.getElementById('status').style.color = "red";
              return;
            }

            // Dibujar el Restaurante (Origen)
            if (data.restaurante && !marcadorRestaurante) {
              marcadorRestaurante = L.marker([data.restaurante.lat, data.restaurante.lng])
                .addTo(mapaObj).bindPopup("🏪 Restaurante Quirquinita").openPopup();
            }

            // Dibujar al Cliente (Destino)
            if (data.cliente && !marcadorCliente) {
              marcadorCliente = L.marker([data.cliente.lat, data.cliente.lng])
                .addTo(mapaObj).bindPopup("📍 Casa del Cliente");
            }

            // Dibujar al Repartidor (Posición actual en BD)
            if (data.repartidor && !marcadorMoto) {
              marcadorMoto = L.marker([data.repartidor.lat, data.repartidor.lng])
                .addTo(mapaObj).bindPopup("🏍️ " + (data.repartidorNombre || "Repartidor"));
              
              // Centrar la cámara en la moto
              mapaObj.setView([data.repartidor.lat, data.repartidor.lng], 15);
            }

            document.getElementById('status').innerText = "Mapa listo. Conectado a la señal GPS en vivo.";
            document.getElementById('status').style.color = "#0056b3";

            // 2. CONECTAR AL WEBSOCKET PARA EL MOVIMIENTO EN TIEMPO REAL
            socket.emit('join_order_room', orderId);
            
            socket.on('delivery_update', (coordenadas) => {
              console.log("📍 Coordenadas de la moto recibidas:", coordenadas);
              
              if (!coordenadas || !coordenadas.lat || !coordenadas.lng) return;

              document.getElementById('status').innerText = "📍 Moto en movimiento: Lat " + coordenadas.lat + " / Lng " + coordenadas.lng;
              document.getElementById('status').style.color = "#28a745";
              
              const posicionNueva = [coordenadas.lat, coordenadas.lng];
              
              if (!marcadorMoto) {
                marcadorMoto = L.marker(posicionNueva).addTo(mapaObj).bindPopup("🏍️ Repartidor en camino");
              } else {
                marcadorMoto.setLatLng(posicionNueva); // Mueve el marcador suavemente
              }
              
              mapaObj.setView(posicionNueva); // Persigue a la moto con la cámara
            });

          } catch (error) {
             console.error("Error al cargar el mapa:", error);
             document.getElementById('status').innerText = "Error de conexión con el servidor.";
             document.getElementById('status').style.color = "red";
          }
        }
      </script>
    </body>
    </html>
  `);
});

export default app
