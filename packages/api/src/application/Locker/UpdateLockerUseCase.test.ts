import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MemberRepository } from '../../domain/MemberRepository.js';
import type { LockerRepository } from '../../domain/LockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import type { LockerDTO } from '@alentapp/shared';

/**
 * Tests Unitarios para UpdateLockerUseCase (TDD_0002)
 * Cubre los casos de uso para actualizar un Locker existente
 */
describe('UpdateLockerUseCase', () => {
    const mockLockerRepo = {
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
    } as unknown as LockerRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const lockerValidator = new LockerValidator(mockLockerRepo);
    const useCase = new UpdateLockerUseCase(
        mockLockerRepo,
        lockerValidator,
        mockMemberRepo,
    );

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
        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValue(null);
        vi.mocked(mockLockerRepo.update).mockResolvedValue(baseLocker);
        vi.mocked(mockMemberRepo.findById).mockResolvedValue({ id: 'member-1' } as any);
    });

    /**
     * Rechazar actualización si el locker no existe
     */
    it('debe lanzar error si el locker no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-x', { status: 'Disponible' }),
        ).rejects.toThrow('El Locker no existe');
    });

    /**
     * Actualizar locker exitosamente con datos válidos
     */
    it('debe actualizar locker cuando el payload es valido', async () => {
        const updatedLocker: LockerDTO = {
            ...baseLocker,
            location: 'Vestuario B',
            status: 'Ocupado',
            member_id: 'member-1',
        };
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce(updatedLocker);

        const result = await useCase.execute('locker-1', {
            location: 'Vestuario B',
            status: 'Ocupado',
            member_id: 'member-1',
        });

        expect(result).toEqual(updatedLocker);
        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', {
            location: 'Vestuario B',
            status: 'Ocupado',
            member_id: 'member-1',
        });
    });

    /**
     * Rechazar actualización si el nuevo número ya existe en otro locker
     */
    it('debe rechazar numero duplicado', async () => {
        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce({
            ...baseLocker,
            id: 'locker-2',
            number: 2,
        });

        await expect(
            useCase.execute('locker-1', { number: 2 }),
        ).rejects.toThrow('Ya existe un Locker con ese número');
    });

    /**
     * Rechazar asignación de socio si el locker está en mantenimiento
     */
    it('debe rechazar asignacion si el locker esta en mantenimiento', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...baseLocker,
            status: 'Mantenimiento',
        });

        await expect(
            useCase.execute('locker-1', { member_id: 'member-1' }),
        ).rejects.toThrow('El Locker está en mantenimiento y no puede asignarse');
    });

    /**
     * Rechazar cambio a mantenimiento si el locker tiene un socio asignado
     */
    it('debe rechazar pasar a mantenimiento si tiene socio asignado', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...baseLocker,
            status: 'Ocupado',
            member_id: 'member-1',
        });

        await expect(
            useCase.execute('locker-1', { status: 'Mantenimiento' }),
        ).rejects.toThrow(
            'No se puede poner en mantenimiento un Locker ocupado. Desasigná el socio primero',
        );
    });

    /**
     * Rechazar reasignación a otro socio si el locker ya está ocupado
     */
    it('debe rechazar reasignacion cuando ya esta ocupado por otro socio', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce({
            ...baseLocker,
            status: 'Ocupado',
            member_id: 'member-1',
        });

        await expect(
            useCase.execute('locker-1', { member_id: 'member-2' }),
        ).rejects.toThrow('El Locker ya se encuentra ocupado');
    });

    /**
     * Rechazar asignación si el socio no existe en la base de datos
     */
    it('debe rechazar asignacion cuando el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-1', { member_id: 'member-x' }),
        ).rejects.toThrow('El socio no existe');
    });
});