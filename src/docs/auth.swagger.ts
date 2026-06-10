// src/docs/auth.swagger.ts

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autentica credenciales de acceso
 *     description: El sistema procesa la solicitud comparando las credenciales y devuelve un token de sesión.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "gus@gmail.com"
 *               password:
 *                 type: string
 *                 example: "gus1234"
 *     responses:
 *       200:
 *         description: El sistema validó las credenciales y emitió el token.
 *       401:
 *         description: El sistema rechazó la solicitud por credenciales incorrectas.
 *       404:
 *         description: Usuario no encontrado en el sistema.
 *       500:
 *         description: Error interno del servidor.
 */