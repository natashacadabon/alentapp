import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository } from '../../domain/PaymentRepository.js';
import { PaymentValidator } from '../../domain/services/PaymentValidator.js';

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateUpdatePayload: vi.fn(),
        validatePaymentExists: vi.fn(),
        validatePaymentCanBeUpdated: vi.fn(),
        validateStatus: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new UpdatePaymentUseCase(
        mockPaymentRepo,
        mockPaymentValidator,
    );

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const existingPayment = {
        id: 'payment-1',
        member_id: 'member-1',
        amount: 15000,
        month: 5,
        year: 2026,
        due_date: '2026-05-30',
        status: 'Pendiente',
        payment_date: null,
    };

    // Test 1: Verifica que execute lanza error cuando el payload de actualización es inválido.
    it('debe lanzar error si el payload de actualización es inválido', async () => {
        vi.mocked(
            mockPaymentValidator.validateUpdatePayload,
        ).mockImplementationOnce(() => {
            throw new Error('Debe informar al menos un campo para actualizar');
        });

        await expect(
            useCase.execute('payment-1', {} as any),
        ).rejects.toThrow('Debe informar al menos un campo para actualizar');

        expect(mockPaymentValidator.validateUpdatePayload).toHaveBeenCalledWith(
            {},
        );
        expect(mockPaymentRepo.findById).not.toHaveBeenCalled();
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    // Test 2: Verifica que execute lanza error cuando el pago no existe.
    it('debe lanzar error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        vi.mocked(
            mockPaymentValidator.validatePaymentExists,
        ).mockImplementationOnce(() => {
            throw new Error('Pago no encontrado');
        });

        await expect(
            useCase.execute('payment-999', { status: 'Pagado' }),
        ).rejects.toThrow('Pago no encontrado');

        expect(mockPaymentValidator.validateUpdatePayload).toHaveBeenCalledWith(
            { status: 'Pagado' },
        );
        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-999');
        expect(mockPaymentValidator.validatePaymentExists).toHaveBeenCalledWith(
            null,
        );
        expect(
            mockPaymentValidator.validatePaymentCanBeUpdated,
        ).not.toHaveBeenCalled();
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    // Test 3: Verifica que execute lanza error cuando el pago no puede actualizarse.
    it('debe lanzar error si el pago no puede actualizarse', async () => {
        const canceledPayment = {
            ...existingPayment,
            status: 'Cancelado',
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            canceledPayment as any,
        );

        vi.mocked(
            mockPaymentValidator.validatePaymentCanBeUpdated,
        ).mockImplementationOnce(() => {
            throw new Error('No se puede actualizar un pago cancelado');
        });

        await expect(
            useCase.execute('payment-1', { status: 'Pagado' }),
        ).rejects.toThrow('No se puede actualizar un pago cancelado');

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-1');
        expect(mockPaymentValidator.validatePaymentExists).toHaveBeenCalledWith(
            canceledPayment,
        );
        expect(
            mockPaymentValidator.validatePaymentCanBeUpdated,
        ).toHaveBeenCalledWith(canceledPayment);
        expect(mockPaymentValidator.validateStatus).not.toHaveBeenCalled();
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    // Test 4: Verifica que execute lanza error cuando el estado solicitado es inválido.
    it('debe lanzar error si el estado solicitado es inválido', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(mockPaymentValidator.validateStatus).mockImplementationOnce(
            () => {
                throw new Error('Estado inválido');
            },
        );

        await expect(
            useCase.execute('payment-1', { status: 'INVALIDO' as any }),
        ).rejects.toThrow('Estado inválido');

        expect(mockPaymentValidator.validateStatus).toHaveBeenCalledWith(
            'INVALIDO',
        );
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    // Test 5: Verifica que execute marca como Pagado usando payment_date informado.
    it('debe actualizar el pago a Pagado y usar payment_date informado', async () => {
        const updatedPayment = {
            ...existingPayment,
            status: 'Pagado',
            payment_date: '2026-05-15',
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce(
            updatedPayment as any,
        );

        const result = await useCase.execute('payment-1', {
            status: 'Pagado',
            payment_date: '2026-05-15',
        });

        expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-1', {
            status: 'Pagado',
            payment_date: '2026-05-15',
        });

        expect(result).toEqual(updatedPayment);
    });

    // Test 6: Verifica que execute marca como Pagado usando la fecha actual si no se informa payment_date.
    it('debe actualizar el pago a Pagado y usar la fecha actual si no se informa payment_date', async () => {
        const updatedPayment = {
            ...existingPayment,
            status: 'Pagado',
            payment_date: '2026-05-20',
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce(
            updatedPayment as any,
        );

        const result = await useCase.execute('payment-1', {
            status: 'Pagado',
        });

        expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-1', {
            status: 'Pagado',
            payment_date: '2026-05-20',
        });

        expect(result).toEqual(updatedPayment);
    });

    // Test 7: Verifica que execute ajusta estado a Vencido cuando corresponde por vencimiento.
    it('debe actualizar el pago a Vencido si está vencido y no se intenta marcar como Pagado', async () => {
        const expiredPayment = {
            ...existingPayment,
            due_date: '2026-05-01',
            status: 'Pendiente',
        };

        const updatedPayment = {
            ...expiredPayment,
            status: 'Vencido',
            payment_date: null,
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            expiredPayment as any,
        );

        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce(
            updatedPayment as any,
        );

        const result = await useCase.execute('payment-1', {
            status: 'Pendiente',
        });

        expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-1', {
            status: 'Vencido',
            payment_date: null,
        });

        expect(result).toEqual(updatedPayment);
    });

    // Test 8: Verifica que execute fuerza payment_date en null cuando el estado no es Pagado.
    it('debe actualizar el pago con payment_date null si el estado no es Pagado', async () => {
        const updatedPayment = {
            ...existingPayment,
            status: 'Cancelado',
            payment_date: null,
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(mockPaymentRepo.update).mockResolvedValueOnce(
            updatedPayment as any,
        );

        const result = await useCase.execute('payment-1', {
            status: 'Cancelado',
            payment_date: '2026-05-15',
        });

        expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-1', {
            status: 'Cancelado',
            payment_date: null,
        });

        expect(result).toEqual(updatedPayment);
    });
});