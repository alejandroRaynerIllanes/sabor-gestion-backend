import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verificarToken, CustomRequest } from '../../../middlewares/auth.middleware';import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mockeamos la librería jsonwebtoken
vi.mock('jsonwebtoken');

describe('Auth Middleware - verificarToken', () => {
  let mockRequest: Partial<CustomRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = vi.fn();

  beforeEach(() => {
    // Reiniciamos los mocks antes de cada test
    vi.clearAllMocks();
    
    mockRequest = {
      header: vi.fn()
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      
    };
  });

  it('debe llamar a next() si el token es válido', () => {
    // Configuración
    const mockUser = { id: 1, rol: 'admin' };
    (mockRequest.header as any).mockReturnValue('Bearer token_valido');
    (jwt.verify as any).mockReturnValue(mockUser);

    // Ejecución
    verificarToken(mockRequest as CustomRequest, mockResponse as Response, nextFunction);

    // Aserciones
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.usuario).toEqual(mockUser);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si no se proporciona el header Authorization', () => {
    // Configuración: el header devuelve undefined
    (mockRequest.header as any).mockReturnValue(undefined);

    // Ejecución
    verificarToken(mockRequest as CustomRequest, mockResponse as Response, nextFunction);

    // Aserciones
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      mensaje: 'Acceso denegado. No se proporcionó un token.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('debe retornar 401 si el token es inválido o ha expirado', () => {
    // Configuración
    (mockRequest.header as any).mockReturnValue('Bearer token_falso');
    // Forzamos a que jwt.verify lance un error
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('JsonWebTokenError');
    });

    // Ejecución
    verificarToken(mockRequest as CustomRequest, mockResponse as Response, nextFunction);

    // Aserciones
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      mensaje: 'Token inválido o expirado.'
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });
});