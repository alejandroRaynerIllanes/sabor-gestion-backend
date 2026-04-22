import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Categoria from '../../../models/Categoria';

describe('Categoria Model Unit Test', () => {
  
  it('debe crear una categoría válida si tiene todos los campos requeridos', () => {
    const datosValidos = { nombre: 'Postres' };
    const categoria = new Categoria(datosValidos);

    // Verificamos que no haya errores de validación
    const error = categoria.validateSync();
    
    expect(error).toBeUndefined();
    expect(categoria.nombre).toBe(datosValidos.nombre);
  });

  it('debe fallar la validación si el nombre está vacío', () => {
    const categoriaSinNombre = new Categoria({});

    const error = categoriaSinNombre.validateSync();

    // Verificamos que el error sea específicamente por el campo 'nombre'
    expect(error?.errors['nombre']).toBeDefined();
    expect(error?.errors['nombre'].message).toBe('Path `nombre` is required.');
  });

  it('debe aplicar trim al nombre', () => {
    const nombreConEspacios = '   Bebidas   ';
    const categoria = new Categoria({ nombre: nombreConEspacios });

    // Mongoose aplica el trim antes de guardar/validar
    expect(categoria.nombre).toBe('Bebidas');
  });

  it('debe tener los campos de timestamps automáticos', () => {
    const categoria = new Categoria({ nombre: 'Entradas' });
    
    // Aunque no se guarde en DB real, el esquema debe tener definidos estos campos
    expect(categoria.get('createdAt')).toBeUndefined(); // Es undefined hasta que se hace .save()
    // Pero verificamos que el esquema los soporte
    expect(Categoria.schema.options.timestamps).toBe(true);
  });
});