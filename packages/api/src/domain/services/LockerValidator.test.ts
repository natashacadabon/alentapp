import { describe, it, expect, vi } from 'vitest';
import type { LockerRepository } from '../../domain/LockerRepository.js';
import type { LockerDTO } from '@alentapp/shared';
import { LockerValidator } from './LockerValidator.js';

/**
 * Tests Unitarios para LockerValidator
 * Cubre validaciones de negocio para Lockers (TDD_0001, TDD_0002, TDD_0003)
 */
describe('LockerValidator', () => {
    const mockLockerRepo = {
        findByNumber: vi.fn(),
    } as unknown as LockerRepository;

    const validator = new LockerValidator(mockLockerRepo);

    const baseLocker: LockerDTO = {
        id: 'locker-1',
        number: 1,
        location: 'Vestuario A',
        status: 'Disponible',
        member_id: null,
    };

    /**
     *Validar que el número sea positivo
     */
    it('debe validar que el número sea positivo', () => {
        expect(() => validator.validateNumber(0)).toThrow(
            'El número de Locker debe ser positivo',
        );

        expect(() => validator.validateNumber(-10)).toThrow(
            'El número de Locker debe ser positivo',
        );

        expect(() => validator.validateNumber(3.5)).toThrow(
            'El número de Locker debe ser positivo',
        );

        // Debe pasar sin error
        expect(() => validator.validateNumber(1)).not.toThrow();
        expect(() => validator.validateNumber(100)).not.toThrow();
    });

    /**
     *Validar que la ubicación no esté vacía
     */
    it('debe validar que la ubicación no esté vacía', () => {
        expect(() => validator.validateLocation('')).toThrow(
            'La ubicación es obligatoria',
        );

        expect(() => validator.validateLocation('   ')).toThrow(
            'La ubicación es obligatoria',
        );

        // Debe pasar sin error
        expect(() => validator.validateLocation('Vestuario A')).not.toThrow();
        expect(() => validator.validateLocation('Vestuario A - Fila 1')).not.toThrow();
    });

    /**
     *Validar que el número sea único
     */
    it('debe validar que el número sea único', async () => {
        const existingLocker: LockerDTO = {
            ...baseLocker,
            number: 5,
        };

        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(
            existingLocker,
        );

        await expect(validator.validateNumberIsUnique(5)).rejects.toThrow(
            'Ya existe un Locker con ese número',
        );

        // Debe pasar sin error cuando el número es único
        vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(null);
        await expect(validator.validateNumberIsUnique(10)).resolves.not.toThrow();
    });

    /**
     * Rechazar asignación si el locker está en Mantenimiento
     */
    it('debe rechazar asignación si el locker está en Mantenimiento', () => {
        const maintenanceLocker: LockerDTO = {
            ...baseLocker,
            status: 'Mantenimiento',
        };

        expect(() =>
            validator.validateMaintenanceAssignment(
                maintenanceLocker.status,
                'Mantenimiento',
                'member-1',
            ),
        ).toThrow('El Locker está en mantenimiento y no puede asignarse');

        // Debe pasar si no se intenta asignar
        expect(() =>
            validator.validateMaintenanceAssignment(
                maintenanceLocker.status,
                'Mantenimiento',
                null,
            ),
        ).not.toThrow();
    });

    /**
     *Rechazar pasar a Mantenimiento si tiene socio asignado
     */
    it('debe rechazar pasar a Mantenimiento si tiene socio asignado', () => {
        const occupiedLocker: LockerDTO = {
            ...baseLocker,
            status: 'Ocupado',
            member_id: 'member-1',
        };

        expect(() =>
            validator.validateMaintenanceAssignment(
                occupiedLocker.status,
                'Mantenimiento',
                occupiedLocker.member_id,
            ),
        ).toThrow(
            'No se puede poner en mantenimiento un Locker ocupado. Desasigná el socio primero',
        );

        // Debe pasar si se desasigna el socio
        expect(() =>
            validator.validateMaintenanceAssignment(
                occupiedLocker.status,
                'Mantenimiento',
                null,
            ),
        ).not.toThrow();
    });

    /**
     *Rechazar asignación a otro socio si está Ocupado
     */
    it('debe rechazar asignación a otro socio si está Ocupado', () => {
        const occupiedLocker: LockerDTO = {
            ...baseLocker,
            status: 'Ocupado',
            member_id: 'member-1',
        };

        // Intenta asignar a un socio diferente
        expect(() =>
            validator.validateOccupiedReassignment(
                occupiedLocker,
                'member-2',
            ),
        ).toThrow('El Locker ya se encuentra ocupado');

        // Debe pasar si se intenta asignar el mismo socio
        expect(() =>
            validator.validateOccupiedReassignment(
                occupiedLocker,
                'member-1',
            ),
        ).not.toThrow();

        // Debe pasar si se desasigna (null)
        expect(() =>
            validator.validateOccupiedReassignment(
                occupiedLocker,
                null,
            ),
        ).not.toThrow();

        // Debe pasar si el locker está disponible
        const availableLocker: LockerDTO = {
            ...baseLocker,
            status: 'Disponible',
            member_id: null,
        };

        expect(() =>
            validator.validateOccupiedReassignment(
                availableLocker,
                'member-2',
            ),
        ).not.toThrow();
    });
});
