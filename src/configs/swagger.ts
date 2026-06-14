import swaggerJSDoc from 'swagger-jsdoc'

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Sabor & Gestión',
      version: '1.0.0',
      description:
        'Documentación técnica del comportamiento del sistema backend. Detalla las validaciones de datos, flujos de estado y operaciones en la base de datos MongoDB.'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Introduce el token generado en el endpoint de login.'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          required: ['nombre', 'apellido', 'ci', 'email', 'password', 'rol'],
          properties: {
            _id: { type: 'string', description: 'ObjectId generado por MongoDB.' },
            nombre: { type: 'string' },
            apellido: { type: 'string' },
            ci: { type: 'string', description: 'Cédula de identidad única.' },
            email: { type: 'string', description: 'Correo electrónico único.' },
            rol: {
              type: 'string',
              enum: ['Administrador', 'Mesero', 'Cocinero', 'Cajero', 'Cliente']
            },
            estado: { type: 'boolean', default: true },
            verificado: { type: 'boolean', default: true }
          }
        },
        Plato: {
          type: 'object',
          required: ['nombre', 'descripcion', 'precio', 'categoria'],
          properties: {
            _id: { type: 'string' },
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            precio: { type: 'number', minimum: 0 },
            imagenUrl: { type: 'string' },
            disponible: { type: 'boolean', default: true },
            categoria: { type: 'string', description: 'ObjectId de la Categoría.' }
          }
        },
        Reserva: {
          type: 'object',
          required: [
            'codigo',
            'pedidoId',
            'fecha',
            'hora',
            'clienteNombre',
            'cantidadPersonas',
            'mesa',
            'usuario'
          ],
          properties: {
            _id: { type: 'string' },
            codigo: { type: 'string' },
            pedidoId: { type: 'string' },
            fecha: { type: 'string', format: 'date' },
            hora: { type: 'string' },
            clienteNombre: { type: 'string' },
            cantidadPersonas: { type: 'integer', minimum: 1 },
            vip: { type: 'boolean', default: false },
            mesa: { type: 'string', description: 'ObjectId de la Mesa.' },
            usuario: { type: 'string', description: 'ObjectId del Usuario.' }
          }
        },
        DetallePedido: {
          type: 'object',
          required: ['plato', 'cantidad', 'precioUnitario', 'subtotal'],
          properties: {
            plato: { type: 'string', description: 'ObjectId del Plato.' },
            cantidad: { type: 'integer', minimum: 1 },
            precioUnitario: { type: 'number' },
            subtotal: { type: 'number' },
            observacion: { type: 'string' }
          }
        },
        Pedido: {
          type: 'object',
          required: ['codigo', 'total', 'usuario'],
          properties: {
            _id: { type: 'string' },
            codigo: { type: 'string' },
            fechaHora: { type: 'string', format: 'date-time' },
            estado: {
              type: 'string',
              enum: ['ABIERTO', 'EN_PREPARACION', 'ENTREGADO', 'CANCELADO', 'CERRADO'],
              default: 'ABIERTO'
            },
            total: { type: 'number' },
            mesa: { type: 'string', description: 'ObjectId de la Mesa (Opcional).' },
            usuario: { type: 'string', description: 'ObjectId del Usuario creador.' },
            detalles: { type: 'array', items: { $ref: '#/components/schemas/DetallePedido' } }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/docs/*.ts', './src/routes/*.ts']
}

export const swaggerSpec = swaggerJSDoc(options)

export const swaggerUiOptions = {
  customJsStr: `
    window.addEventListener('load', () => {
      setTimeout(() => {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const response = await originalFetch(...args);
          const url = args[0] || '';
          if (typeof url === 'string' && url.includes('/api/auth/login') && response.status === 200) {
            response.clone().json().then(data => {
              const token = data.token;
              if (token) {
                window.ui.authActions.authorize({
                  bearerAuth: {
                    name: 'bearerAuth',
                    schema: { type: 'http', in: 'header', name: 'Authorization' },
                    value: token
                  }
                });
                console.log('¡Token inyectado automáticamente!');
                alert('Sesión iniciada: Token capturado y aplicado a todas las rutas 🚀');
              }
            }).catch(err => console.error('Error capturando token:', err));
          }
          return response;
        };
      }, 1000);
    });
  `
}
