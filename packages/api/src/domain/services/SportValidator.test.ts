import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { SportRepository } from '../SportRepository.js';

describe('SportValidator', () => {
    const mockRepo = {
        findByName: vi.fn(), 
    } as unknown as SportRepository;

    //Instanciamos el validador real que vamos a probar
    const validator = new SportValidator(mockRepo);

    //funcion que borra el historial de llamadas de los mocks para que el resultado 
    //de un test no afecte al siguiente
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('validateMaxCapacity', () => {
        //unit 10
        it('debe lanzar error si max_capacity es invalida', () => {
            expect(() => validator.validateMaxCapacity(0)).toThrow('La capacidad maxima debe ser mayor a cero');
            expect(() => validator.validateMaxCapacity(-5)).toThrow('La capacidad maxima debe ser mayor a cero');
        });
        //unit 11
        it('no debe lanzar error si max_capacity es válido', () => {
            expect(() => validator.validateMaxCapacity(10)).not.toThrow();
        });
    })
    

    
});