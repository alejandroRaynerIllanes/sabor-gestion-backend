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
 *
 * /api/auth/register:
 *   post:
 *     summary: Registra un perfil de usuario
 *     description: El sistema inserta un documento en la colección Usuarios aplicando cifrado a la contraseña.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Gustavo"
 *               email:
 *                 type: string
 *                 example: "gus@gmail.com"
 *               password:
 *                 type: string
 *                 example: "gus1234"
 *     responses:
 *       201:
 *         description: El sistema instanció el documento de usuario.
 *       400:
 *         description: El sistema detectó datos inválidos.
 */