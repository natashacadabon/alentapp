import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockerRepository } from '../../domain/LockerRepository.js';
import type { LockerDTO } from '@alentapp/shared';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';

describe('DeleteLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as LockerRepository;

    const useCase = new DeleteLockerUseCase(mockLockerRepo);

    const baseLocker: LockerDTO = {
        id: 'locker-1',
        number: 1,
        location: 'Vestuario A',
        status: 'Disponible',
        member_id: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLockerRepo.findById).mockResolvedValue(baseLocker);
        vi.mocked(mockLockerRepo.delete).mockResolvedValue(undefined);
    });

    it('debe lanzar error si el locker no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('locker-x')).rejects.toThrow(
            'El Locker no existe',
        );
    });

    it('debe lanzar error si el locker esta ocupado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...baseLocker,
            status: 'Ocupado',
            member_id: 'member-1',
        });

        await expect(useCase.execute('locker-1')).rejects.toThrow(
            'No se puede eliminar un Locker con un socio asignado',
        );
    });

    it('debe aplicar borrado logico si no esta ocupado', async () => {
        await useCase.execute('locker-1');

        expect(mockLockerRepo.delete).toHaveBeenCalledWith('locker-1');
    });
});
