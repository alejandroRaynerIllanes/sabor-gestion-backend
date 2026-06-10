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
 *               password:
 *                 type: string
 *           examples:
 *             administrador:
 *               summary: Credenciales Administrador
 *               value:
 *                 email: "gus@gmail.com"
 *                 password: "gus1234"
 *
 *             repartidor:
 *               summary: Credenciales Repartidor
 *               value:
 *                 email: "repartidor@quirquinita.com"
 *                 password: "password123"
 *
 *             cliente:
 *               summary: Credenciales Cliente
 *               value:
 *                 email: "cliente@quirquinita.com"
 *                 password: "password123"
 *
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

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario en el sistema
 *     description: El sistema recibe los datos de entrada, encripta la contraseña y almacena el nuevo documento en la base de datos, asignando los valores por defecto correspondientes a su esquema.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - apellido
 *               - ci
 *               - email
 *               - password
 *               - rol
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Carlos"
 *               apellido:
 *                 type: string
 *                 example: "Mendoza"
 *               ci:
 *                 type: string
 *                 description: Cédula de identidad única en el sistema.
 *                 example: "12345678"
 *               email:
 *                 type: string
 *                 description: Correo electrónico único en el sistema.
 *                 example: "cliente@quirquinita.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               rol:
 *                 type: string
 *                 enum:
 *                   - Administrador
 *                   - Mesero
 *                   - Cocinero
 *                   - Cajero
 *                   - Cliente
 *                   - repartidor
 *                 example: "Cliente"
 *     responses:
 *       201:
 *         description: El sistema creó el usuario exitosamente y lo almacenó en la base de datos.
 *       400:
 *         description: El sistema rechazó la solicitud por la falta de un campo obligatorio o formato inválido.
 *       409:
 *         description: El sistema detectó un conflicto de duplicidad (el email o el CI ya se encuentran registrados).
 *       500:
 *         description: Error interno del servidor durante la inserción en MongoDB.
 */