import { Request, Response } from 'express';
import Usuario from '../models/Usuario';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginUsuario = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        //LOG 1: Ver quién intenta entrar
        console.log(`\n🔑 [LOGIN] Intento de acceso con email: ${email}`);

        // 1. Buscar si el usuario existe por su email
        const usuarioEncontrado = await Usuario.findOne({ email });
        if (!usuarioEncontrado) {
            console.log(` [LOGIN] Falló: Usuario no encontrado en la BD.`);
            return res.status(404).json({ mensaje: 'Usuario no encontrado en el sistema' });
        }

        // 2. Verificar si está activo (no dejamos entrar a usuarios inactivos)
        if (!usuarioEncontrado.estado) {
            return res.status(403).json({ mensaje: 'Esta cuenta ha sido desactivada. Contacta al administrador.' });
        }

        // 3. Comparar la contraseña que ingresó con la encriptada en la base de datos
        const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
        if (!passwordValida) {
            console.log(` [LOGIN] Falló: Contraseña incorrecta para ${email}.`);
            return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
        }
        console.log(`[LOGIN] Éxito: ${usuarioEncontrado.nombre} ha iniciado sesión.`);

        // 4. Generar el Token JWT
        const token = jwt.sign(
            { id: usuarioEncontrado._id, rol: usuarioEncontrado.rol }, 
            process.env.JWT_SECRET || 'secreto_temporal_de_desarrollo', 
            { expiresIn: '8h' }
        );

        // 5. Devolver la respuesta al frontend
        res.status(200).json({
            mensaje: 'Bienvenido a Sabor & Gestión',
            token: token,
            usuario: {
                id: usuarioEncontrado._id,
                nombre: usuarioEncontrado.nombre,
                apellido: usuarioEncontrado.apellido,
                rol: usuarioEncontrado.rol
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor al intentar hacer login' });
    }
};