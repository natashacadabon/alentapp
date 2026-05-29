import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../../domain/SportRepository.js';
import { SportValidator } from '../../domain/services/SportValidator.js';

describe('UpdateSportUseCase', () => {
    // 1. Creamos mocks de las dependencias
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateMaxCapacity: vi.fn(),
    } as unknown as SportValidator;

    // 2. Instanciamos el caso de uso con los mocks
    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    //unit 3
    it('debe actualizar exitosamente description y max_capacity', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            id: '1', name: 'Fútbol', description: 'Vieja',
            max_capacity: 22, additional_price: 500, requires_medical_certificate: true
        });
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({
            id: '1', name: 'Fútbol', description: 'Nueva',
            max_capacity: 30, additional_price: 500, requires_medical_certificate: true
        });

        const result = await useCase.execute('1', { description: 'Nueva', max_capacity: 30 });

        // Verificamos que se validó la capacidad antes de persistir
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(30);
        expect(mockSportRepo.update).toHaveBeenCalledWith('1', { description: 'Nueva', max_capacity: 30 });
        expect(result.description).toBe('Nueva');
        expect(result.max_capacity).toBe(30);
    });

    //unit 4
    it('debe lanzar error si el deporte no existe', async () => {
        // Simulamos que el repositorio no encuentra el deporte
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('999', { max_capacity: 30 }))
            .rejects.toThrow('El deporte indicado no se encuentra registrado');

        // Verificamos que no se intentó persistir nada
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    //init 5
    it('debe lanzar error si la nueva capacidad máxima es inválida', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            id: '1', name: 'Fútbol', description: 'Desc',
            max_capacity: 22, additional_price: 500, requires_medical_certificate: true
        });

        // Simulamos que el validator rechaza la capacidad
        vi.mocked(mockSportValidator.validateMaxCapacity).mockImplementationOnce(() => {
            throw new Error('La capacidad máxima debe ser mayor a cero');
        });

        await expect(useCase.execute('1', { max_capacity: 0 }))
            .rejects.toThrow('La capacidad máxima debe ser mayor a cero');

        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

});