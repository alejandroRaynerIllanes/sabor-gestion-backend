import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUsuario } from '../../../controllers/auth.controller';
import Usuario from '../../../models/Usuario';
import bcrypt from 'bcryptjs';

// 1. Mockeamos las dependencias externas
vi.mock('../../../models/Usuario');
vi.mock('bcryptjs');

describe('Auth Controller - loginUsuario', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    // Limpiamos los mocks antes de cada test
    vi.clearAllMocks();

    // Seteamos el objeto request y response
    req = {
      body: {
        email: 'test@restaurante.com',
        password: 'password123'
      }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('Debe devolver 404 si el usuario no existe', async () => {
    // Simulamos que el modelo devuelve null
    (Usuario.findOne as any).mockResolvedValue(null);

    await loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Usuario no encontrado en el sistema' });
  });

  it('Debe devolver 403 si el usuario está inactivo (estado: false)', async () => {
    // Simulamos un usuario encontrado pero inactivo
    (Usuario.findOne as any).mockResolvedValue({ email: 'test@restaurante.com', estado: false });

    await loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        mensaje: expect.stringContaining('cuenta ha sido desactivada') 
    }));
  });

  it('Debe devolver 401 si la contraseña es incorrecta', async () => {
    // Usuario activo encontrado
    (Usuario.findOne as any).mockResolvedValue({ email: 'test@restaurante.com', estado: true, password: 'hash' });
    // Simulamos que bcrypt dice que NO coinciden
    (bcrypt.compare as any).mockResolvedValue(false);

    await loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Contraseña incorrecta' });
  });

  it('Debe devolver 200 y el token si todo es correcto', async () => {
    // Simulamos éxito total
    const mockUser = { 
        _id: '123', 
        nombre: 'Ingeniera', 
        apellido: 'QA', 
        rol: 'admin', 
        estado: true, 
        password: 'hash' 
    };
    (Usuario.findOne as any).mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    await loginUsuario(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      mensaje: 'Bienvenido a Sabor & Gestión',
      token: expect.any(String),
      usuario: expect.objectContaining({ nombre: 'Ingeniera' })
    }));
  });
});