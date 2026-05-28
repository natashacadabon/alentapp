import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPaymentsUseCase } from './GetPaymentsUseCase.js';
import { PaymentRepository } from '../../domain/PaymentRepository.js';

describe('GetPaymentsUseCase', () => {
    const mockPaymentRepo = {
        findAll: vi.fn(),
    } as unknown as PaymentRepository;

    const useCase = new GetPaymentsUseCase(mockPaymentRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de pagos', async () => {
        const mockPayments = [
            {
                id: 'payment-1',
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10',
                status: 'Pendiente',
                payment_date: null,
            },
            {
                id: 'payment-2',
                member_id: 'member-2',
                amount: 20000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10',
                status: 'Pagado',
                payment_date: '2026-05-01',
            },
        ];

        vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce(
            mockPayments as any,
        );

        const result = await useCase.execute();

        expect(result).toEqual(mockPayments);
        expect(mockPaymentRepo.findAll).toHaveBeenCalledOnce();
    });
});