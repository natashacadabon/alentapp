import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeletePaymentUseCase } from './DeletePaymentUseCase.js';
import { PaymentRepository } from '../../domain/PaymentRepository.js';
import { PaymentValidator } from '../../domain/services/PaymentValidator.js';

describe('DeletePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        cancel: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validatePaymentExists: vi.fn(),
        validatePaymentCanBeCanceled: vi.fn(),
    } as unknown as PaymentValidator;

    const useCase = new DeletePaymentUseCase(
        mockPaymentRepo,
        mockPaymentValidator,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test 1: Verifica que execute lanza error cuando el pago no existe.
    it('debe lanzar error si el pago no existe', async () => {
        const error = new Error('Pago no encontrado');

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);
        vi.mocked(
            mockPaymentValidator.validatePaymentExists,
        ).mockImplementationOnce(() => {
            throw error;
        });

        await expect(useCase.execute('payment-999')).rejects.toThrow(
            'Pago no encontrado',
        );

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-999');
        expect(mockPaymentValidator.validatePaymentExists).toHaveBeenCalledWith(
            null,
        );
        expect(
            mockPaymentValidator.validatePaymentCanBeCanceled,
        ).not.toHaveBeenCalled();
        expect(mockPaymentRepo.cancel).not.toHaveBeenCalled();
    });

    // Test 2: Verifica que execute lanza error cuando el pago ya está cancelado.
    it('debe lanzar error si el pago ya está cancelado', async () => {
        const existingPayment = {
            id: 'payment-1',
            member_id: 'member-1',
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            status: 'Cancelado',
            payment_date: null,
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(
            mockPaymentValidator.validatePaymentCanBeCanceled,
        ).mockImplementationOnce(() => {
            throw new Error('El pago ya se encuentra cancelado');
        });

        await expect(useCase.execute('payment-1')).rejects.toThrow(
            'El pago ya se encuentra cancelado',
        );

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-1');
        expect(mockPaymentValidator.validatePaymentExists).toHaveBeenCalledWith(
            existingPayment,
        );
        expect(
            mockPaymentValidator.validatePaymentCanBeCanceled,
        ).toHaveBeenCalledWith(existingPayment);
        expect(mockPaymentRepo.cancel).not.toHaveBeenCalled();
    });

    // Test 3: Verifica que execute cancela el pago cuando existe y es cancelable.
    it('debe cancelar el pago si existe y puede ser cancelado', async () => {
        const existingPayment = {
            id: 'payment-1',
            member_id: 'member-1',
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            status: 'Pendiente',
            payment_date: null,
        };

        const canceledPayment = {
            ...existingPayment,
            status: 'Cancelado',
        };

        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(
            existingPayment as any,
        );

        vi.mocked(mockPaymentRepo.cancel).mockResolvedValueOnce(
            canceledPayment as any,
        );

        const result = await useCase.execute('payment-1');

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-1');
        expect(mockPaymentValidator.validatePaymentExists).toHaveBeenCalledWith(
            existingPayment,
        );
        expect(
            mockPaymentValidator.validatePaymentCanBeCanceled,
        ).toHaveBeenCalledWith(existingPayment);
        expect(mockPaymentRepo.cancel).toHaveBeenCalledWith('payment-1');
        expect(result).toEqual(canceledPayment);
    });
});