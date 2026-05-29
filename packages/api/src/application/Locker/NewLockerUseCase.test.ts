import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LockerRepository } from '../../domain/LockerRepository.js';
import type { MemberRepository } from '../../domain/MemberRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { CreateLockerUseCase } from './NewLockerUseCase.js';
import type { LockerDTO } from '@alentapp/shared';

/**
 * Tests Unitarios para CreateLockerUseCase (TDD_0001)
 * Cubre los casos de uso para crear un nuevo Locker
 */
describe('CreateLockerUseCase', () => {
    const mockLockerRepo = {
        findByNumber: vi.fn(),
        create: vi.fn(),
    } as unknown as LockerRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const lockerValidator = new LockerValidator(mockLockerRepo);
    const useCase = new CreateLockerUseCase(
        mockLockerRepo,
        lockerValidator,
        mockMemberRepo,
    );

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValue(null);
    });

    /**
     *Crear locker exitosamente con datos válidos
     */
    it('debe crear un locker cuando los datos son válidos', async () => {
        const createdLocker: LockerDTO = {
            id: 'locker-1',
            number: 1,
            location: 'Vestuario A - Fila 1',
            status: 'Disponible',
            member_id: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(createdLocker);

        const result = await useCase.execute({
            number: 1,
            location: 'Vestuario A - Fila 1',
        });

        expect(result).toEqual(createdLocker);
        expect(mockLockerRepo.create).toHaveBeenCalledWith({
            number: 1,
            location: 'Vestuario A - Fila 1',
            status: 'Disponible',
            member_id: null,
        });
    });

    /**
     *Rechazar número de locker duplicado
     */
    it('debe rechazar número duplicado', async () => {
        const existingLocker: LockerDTO = {
            id: 'locker-existing',
            number: 5,
            location: 'Vestuario B',
            status: 'Disponible',
            member_id: null,
        };

        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(
            existingLocker,
        );

        await expect(
            useCase.execute({
                number: 5,
                location: 'Vestuario A',
            }),
        ).rejects.toThrow('Ya existe un Locker con ese número');
    });

    /**
     *Rechazar número negativo o cero
     */
    it('debe rechazar número negativo o cero', async () => {
        await expect(
            useCase.execute({
                number: 0,
                location: 'Vestuario A',
            }),
        ).rejects.toThrow('El número de Locker debe ser positivo');

        await expect(
            useCase.execute({
                number: -5,
                location: 'Vestuario A',
            }),
        ).rejects.toThrow('El número de Locker debe ser positivo');
    });

    /**
     *Rechazar ubicación vacía o ausente
     */
    it('debe rechazar ubicación vacía o ausente', async () => {
        await expect(
            useCase.execute({
                number: 1,
                location: '',
            }),
        ).rejects.toThrow('La ubicación es obligatoria');

        await expect(
            useCase.execute({
                number: 1,
                location: '   ',
            }),
        ).rejects.toThrow('La ubicación es obligatoria');
    });

    /**
     *El status inicial debe ser 'Disponible' por defecto
     */
    it('debe establecer status "Disponible" por defecto', async () => {
        const createdLocker: LockerDTO = {
            id: 'locker-2',
            number: 2,
            location: 'Vestuario A - Fila 2',
            status: 'Disponible',
            member_id: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(createdLocker);

        await useCase.execute({
            number: 2,
            location: 'Vestuario A - Fila 2',
        });

        expect(mockLockerRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'Disponible',
            }),
        );
    });

    /**
     *El campo member_id debe quedar en null al crear un locker nuevo
     */
    it('debe establecer member_id null por defecto', async () => {
        const createdLocker: LockerDTO = {
            id: 'locker-3',
            number: 3,
            location: 'Vestuario A - Fila 3',
            status: 'Disponible',
            member_id: null,
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce(createdLocker);

        await useCase.execute({
            number: 3,
            location: 'Vestuario A - Fila 3',
        });

        expect(mockLockerRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                member_id: null,
            }),
        );
    });
});
