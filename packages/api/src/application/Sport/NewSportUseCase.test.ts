import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './NewSportUseCase.js';
import { SportRepository } from '../../domain/SportRepository.js';
import { SportValidator } from '../../domain/services/SportValidator.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
    // 1. Creamos mocks de las dependencias
    const mockSportRepo = {
        create: vi.fn(),
        findByName: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateMaxCapacity: vi.fn(),
        validateNameIsUnique: vi.fn(),
    } as unknown as SportValidator;

    // 2. Instanciamos el caso de uso con los mocks
    const useCase = new CreateSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    //unit 7 - crear deporte con validaciones
    it('debe crear un deporte exitosamente si pasa todas las validaciones', async () => {
        const mockRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: 'Fútbol 11',
            max_capacity: 22,
            additional_price: 500,
            requires_medical_certificate: true,
        };

        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'uuid-1',
            ...mockRequest,
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones de negocio
        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(mockRequest.max_capacity);
        expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith(mockRequest.name);

        // Verificamos que se haya persistido
        expect(mockSportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Fútbol',
            max_capacity: 22,
        }));

        expect(result.id).toBe('uuid-1');
        expect(result.name).toBe('Fútbol');
    });

    // unit 8 
    it('debe lanzar error si el nombre ya existe', async () => {
        const mockRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: '',
            max_capacity: 22,
            additional_price: 500,
            requires_medical_certificate: false,
        };

        vi.mocked(mockSportValidator.validateNameIsUnique).mockRejectedValueOnce(
            new Error('Ya existe un deporte con ese nombre')
        );

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Ya existe un deporte con ese nombre');
        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });

    
});