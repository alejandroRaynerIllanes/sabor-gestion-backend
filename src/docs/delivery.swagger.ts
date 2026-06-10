/**
 * @swagger
 * tags:
 *   - name: Flujo Automatizado - Cliente
 *     description: |
 *       Operaciones del cliente (Ubicación y Checkout)
 *       **🔑 Credenciales de prueba:** `cliente@quirquinita.com` | Pass: `password123`
 *   - name: Flujo Automatizado - Repartidor
 *     description: |
 *       Operaciones del repartidor (Turnos, Cola de pedidos y Estados)
 *       **🏍️ Credenciales de prueba:** `repartidor@quirquinita.com` | Pass: `password123`
 */

/**
 * @swagger
 * /api/delivery/direccion:
 *   post:
 *     summary: Cliente - Paso 1 - Guardar Ubicación
 *     description: El cliente registra su dirección exacta. Captura la Latitud/Longitud (MapCN). El backend bloqueará valores vacíos o en 0.
 *     tags:
 *       - Flujo Automatizado - Cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *               - etiqueta
 *             properties:
 *               lat:
 *                 type: number
 *                 example: -17.393519
 *               lng:
 *                 type: number
 *                 example: -66.1570
 *               etiqueta:
 *                 type: string
 *                 example: Mi Casa
 *     responses:
 *       201:
 *         description: Dirección registrada con éxito en el perfil.
 */

/**
 * @swagger
 * /api/pedidos/checkout:
 *   post:
 *     summary: Cliente - Paso 2 - Agregar al Carrito y Pagar (QR)
 *     description: Procesa los ítems del carrito, valida stock y descuenta inventario. Si hay un repartidor activo en ON, el sistema le amarra la orden al instante y arranca el cronómetro de 3 minutos.
 *     tags:
 *       - Flujo Automatizado - Cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - metodoPago
 *               - coordenadasEntrega
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     platoId:
 *                       type: string
 *                       description: |
 *                         IDs disponibles:
 *                         6a2700cba98c67aafeeeb260 -> Sopa de mani
 *                         6a270226a98c67aafeeeb261 -> Pique Macho
 *                         6a270275a98c67aafeeeb262 -> Picante de Pollo
 *                         6a2702fba98c67aafeeeb263 -> Lechón al Horno
 *                         6a27036da98c67aafeeeb264 -> Fricase
 *                         6a270415a98c67aafeeeb265 -> Sopa de Zapallo
 *                         6a2705cea98c67aafeeeb266 -> Salteñas
 *                         6a27066ea98c67aafeeeb267 -> Tripitas
 *                         6a2706cda98c67aafeeeb268 -> Hamburguesa
 *                         6a270769a98c67aafeeeb269 -> Budín de pan
 *                         6a2707e7a98c67aafeeeb26a -> Torta de frutilla
 *                         6a270877a98c67aafeeeb26b -> Frappe de Chocolate
 *                         6a270988a98c67aafeeeb26c -> Margarita Clásica
 *                         6a270ab3a98c67aafeeeb26d -> Trago de sidra y duraznos
 *                         6a270b39a98c67aafeeeb26e -> Licor de dulce de leche (con vodka)
 *                       example: "6a270226a98c67aafeeeb261"
 *                     cantidad:
 *                       type: number
 *                       example: 1
 *                     precioUnitario:
 *                       type: number
 *                       example: 45
 *                     observacion:
 *                       type: string
 *                       example: Enviar cubiertos
 *               metodoPago:
 *                 type: string
 *                 example: QR
 *               coordenadasEntrega:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: -17.3935
 *                   lng:
 *                     type: number
 *                     example: -66.1570
 *               total:
 *                 type: number
 *                 example: 95
 *             example:
 *               items:
 *                 - platoId: "6a2700cba98c67aafeeeb260"
 *                   cantidad: 1
 *                   precioUnitario: 20
 *                   observacion: "Sopa caliente"
 *                 - platoId: "6a270226a98c67aafeeeb261"
 *                   cantidad: 1
 *                   precioUnitario: 40
 *                   observacion: "Extra locoto"
 *                 - platoId: "6a270275a98c67aafeeeb262"
 *                   cantidad: 1
 *                   precioUnitario: 35
 *                   observacion: "Con bastante salsa"
 *               metodoPago: QR
 *               coordenadasEntrega:
 *                 lat: -17.3935
 *                 lng: -66.1570
 *               total: 95
 *     responses:
 *       201:
 *         description: Pedido creado. Retorna el ID del pedido y asigna repartidor disponible.
 */

/**
 * @swagger
 * /api/delivery/status:
 *   put:
 *     summary: Repartidor - Paso 1 - Ponerse en ON (Disponible)
 *     description: El repartidor activa su estado de disponibilidad para que el backend lo tome en cuenta para asignaciones automáticas en tiempo real.
 *     tags:
 *       - Flujo Automatizado - Repartidor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado cambiado. Repartidor disponible.
 */

/**
 * @swagger
 * /api/delivery/queue:
 *   get:
 *     summary: Repartidor - Paso 2 - Ver Tablero de Pedidos Asignados
 *     description: Recupere la cola de pedidos activos que le asignó el sistema de forma inteligente (Límite síncrono de máximo 5 órdenes concurrentes).
 *     tags:
 *       - Flujo Automatizado - Repartidor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos activos cargada con éxito.
 */

/**
 * @swagger
 * /api/delivery/orders/{id}/state:
 *   put:
 *     summary: Repartidor - Paso 3 - Aceptar Pedido e Iniciar Viaje
 *     description: Actualiza el flujo. Al cambiar a 'En_Transito' se cancela el riesgo de penalización por timeout y se activa la transmisión del mapa dinámico en vivo.
 *     tags:
 *       - Flujo Automatizado - Repartidor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del pedido a transicionar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 example: En_Transito
 *                 enum:
 *                   - En_Cocina
 *                   - En_Transito
 *                   - Entregado
 *     responses:
 *       200:
 *         description: Estado actualizado con éxito. El repartidor va en camino.
 */
/**
 * @swagger
 * /api/delivery/location:
 *   put:
 *     summary: Repartidor - Transmitir GPS
 *     description: Guarda la ubicación actual en la base de datos y la emite por WebSockets.
 *     tags:
 *       - Flujo Automatizado - Repartidor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *             properties:
 *               lat:
 *                 type: number
 *                 example: -17.3900
 *               lng:
 *                 type: number
 *                 example: -66.1500
 *               orderId:
 *                 type: string
 *                 description: ID del pedido actual para el WebSocket
 *                 example: "Pega_Aqui_El_ID_Del_Pedido"
 *     responses:
 *       200:
 *         description: Ubicación actualizada.
 */
/**
 * @swagger
 * /api/delivery/map/{pedidoId}:
 *   get:
 *     summary: Mapa - Obtener Coordenadas Iniciales
 *     description: Recupera las coordenadas del restaurante, el cliente y el repartidor para dibujar el mapa en pantalla.
 *     tags:
 *       - Flujo Automatizado - Cliente
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coordenadas recuperadas.
 */