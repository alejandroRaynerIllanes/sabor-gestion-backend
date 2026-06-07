// src/docs/pedidos.swagger.ts

/**
 * @swagger
 * /api/pedidos:
 *   post:
 *     summary: Instancia un nuevo flujo de pedido
 *     description: El sistema registra un documento inicializando el estado en ABIERTO utilizando los ObjectIds provistos.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mesa:
 *                 type: string
 *               usuario:
 *                 type: string
 *               total:
 *                 type: number
 *               detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     plato:
 *                       type: string
 *                     cantidad:
 *                       type: integer
 *                     precioUnitario:
 *                       type: number
 *                     subtotal:
 *                       type: number
 *                     observacion:
 *                       type: string
 *           example:
 *             mesa: "69fc09a878fd53795f3bcbd6"
 *             usuario: "6a0d1f12cda07db821a83626"
 *             total: 220.00
 *             detalles:
 *               - plato: "69e9385cf0851b34e8b7636a"
 *                 cantidad: 2
 *                 precioUnitario: 35.00
 *                 subtotal: 70.00
 *                 observacion: "Sin cebolla por favor"
 *               - plato: "69e938e8f0851b34e8b7636b"
 *                 cantidad: 1
 *                 precioUnitario: 150.00
 *                 subtotal: 150.00
 *                 observacion: "Bien fría"
 *
 *     responses:
 *       201:
 *         description: El sistema generó el documento de pedido.
 *
 *   get:
 *     summary: Retorna la lista de pedidos generales
 *     description: El sistema extrae los documentos de la colección Pedidos. Permite filtrar por rango de fechas u hoy.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-27"
 *         description: Rango inicial precargado con la fecha actual.
 *
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *           example: "2026-05-27"
 *         description: Rango final precargado con la fecha actual.
 *
 *       - in: query
 *         name: hoy
 *         schema:
 *           type: boolean
 *           example: true
 *         description: Selecciona true para ver estrictamente los pedidos del día en curso.
 *
 *     responses:
 *       200:
 *         description: El sistema emitió la matriz de pedidos.
 *
 * /api/pedidos/{id}/estado:
 *   patch:
 *     summary: Transiciona el estado del pedido
 *     description: El sistema muta la propiedad estado del documento según la máquina de estados de cocina configurada.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "6a0e25fd07575cc57e81edb5"
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 example: "ENTREGADO"
 *
 *     responses:
 *       200:
 *         description: El sistema actualizó el estado del documento.
 *
 * /api/pedidos/{id}/solicitar-cuenta:
 *   patch:
 *     summary: Transiciona el pedido a estado de cobro
 *     description: El sistema altera el estado interno para habilitar la liquidación financiera del cliente.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "6a0e25fd07575cc57e81edb5"
 *
 *     responses:
 *       200:
 *         description: El sistema habilitó la solicitud de cuenta.
 *
 * /api/pedidos/{id}:
 *   put:
 *     summary: Cierra el pedido consolidando los datos de liquidación
 *     description: El sistema actualiza los totales registrando el método de pago utilizado y liberando la infraestructura.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "6a0e25fd07575cc57e81edb5"
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               total:
 *                 type: number
 *               subtotalCierre:
 *                 type: number
 *               metodoPago:
 *                 type: string
 *               montoDescuento:
 *                 type: number
 *               montoPropina:
 *                 type: number
 *               cajeroAsignado:
 *                 type: string
 *           example:
 *             total: 220.00
 *             subtotalCierre: 220.00
 *             metodoPago: "Efectivo"
 *             montoDescuento: 0
 *             montoPropina: 10
 *             cajeroAsignado: "6a17451239511aac240977ae"
 *
 *     responses:
 *       200:
 *         description: El sistema consolidó el cierre operativo del pedido.
 *
 * /api/pedidos/{id}/cancel:
 *   patch:
 *     summary: Anula un documento de pedido
 *     description: El sistema muta el estado a CANCELADO liberando la mesa física asociada.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: El identificador único del pedido a eliminar/cancelar.
 *
 *     responses:
 *       200:
 *         description: El sistema completó la anulación del pedido.
 *       404:
 *         description: El sistema no localizó el pedido indicado.
 */