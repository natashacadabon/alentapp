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
            expect(() => validator.validateMaxCapacity(0)).toThrow('La capacidad máxima debe ser mayor a cero');
            expect(() => validator.validateMaxCapacity(-5)).toThrow('La capacidad máxima debe ser mayor a cero');
        });
        //unit 11
        it('no debe lanzar error si max_capacity es válido', () => {
            expect(() => validator.validateMaxCapacity(10)).not.toThrow();
        });
    })
    
    describe('validateNameIsUnique', () => {
        //unit 12
        it('debe lanzar error si el nombre ya existe', async () => {
            //.mockResolvedValueOnce() simula que la base de datos SÍ encontró un deporte 
            // con ese nombre y devuelve sus datos
            vi.mocked(mockRepo.findByName).mockResolvedValueOnce({
                id: 'uuid-1', name: 'Futbol', description: '', 
                max_capacity: 22, additional_price: 500,
                requires_medical_certificate: true
            });

            await expect(validator.validateNameIsUnique('Futbol'))
                .rejects.toThrow('Ya existe un deporte con ese nombre');
        });

        //unit 13
        it('no debe lanzar error si el nombre no existe', async () => {
            vi.mocked(mockRepo.findByName).mockResolvedValueOnce(null);

            await expect(validator.validateNameIsUnique('Nuevo'))
                .resolves.not.toThrow();
        });
    }); 
});