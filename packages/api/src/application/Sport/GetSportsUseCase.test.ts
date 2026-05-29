import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../../domain/SportRepository.js';

describe('GetSportsUseCase', () => {
    const mockSportRepo = {
        findAll: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new GetSportsUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    //unit 1
    it('debe retornar la lista de deportes del repositorio', async () => {
        const mockSports = [
            { id: '1', name: 'Fútbol', description: "", max_capacity: 22, additional_price: 500, requires_medical_certificate: true },
            { id: '2', name: 'Natación', description: "", max_capacity: 15, additional_price: 0, requires_medical_certificate: false },
        ];

        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce(mockSports);

        const result = await useCase.execute();

        expect(mockSportRepo.findAll).toHaveBeenCalledOnce();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Fútbol');
    });

    //unit 2
    it('debe retornar lista vacía si no hay deportes', async () => {
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toHaveLength(0);
    });
});

