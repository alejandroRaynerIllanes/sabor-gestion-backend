/**
 * @swagger
 * tags:
 *   - name: Flujo Automatizado - Cliente
 *     description: Operaciones del cliente (Ubicación y Checkout)
 *   - name: Flujo Automatizado - Repartidor
 *     description: Operaciones del repartidor (Turnos, Cola de pedidos y Estados)
 */

/**
 * @swagger
 * /api/direcciones:
 *   post:
 *     summary: Cliente - Paso 1 - Guardar Ubicación
 *     description: El cliente registra su dirección exacta. Captura la Latitud/Longitud (MapCN). El backend bloqueará valores vacíos o en 0.
 *     tags: [Flujo Automatizado - Cliente]
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
 *                 example: -17.3935
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
 *     tags: [Flujo Automatizado - Cliente]
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
 *                       example: 60d5ec123456789012345678
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
 *                 example: 45
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
 *     tags: [Flujo Automatizado - Repartidor]
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
 *     tags: [Flujo Automatizado - Repartidor]
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
 *     tags: [Flujo Automatizado - Repartidor]
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