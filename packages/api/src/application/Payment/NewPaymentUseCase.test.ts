import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from './NewPaymentUseCase.js';
import { PaymentRepository } from '../../domain/PaymentRepository.js';
import { MemberRepository } from '../../domain/MemberRepository.js';
import { PaymentValidator } from '../../domain/services/PaymentValidator.js';
import { CreatePaymentRequest } from '@alentapp/shared';

describe('CreatePaymentUseCase', () => {
    const mockPaymentRepository = {
        create: vi.fn(),
    } as unknown as PaymentRepository;

    const mockPaymentValidator = {
        validateAmount: vi.fn(),
        validateMonth: vi.fn(),
        validateYear: vi.fn(),
        validateDueDate: vi.fn(),
        validateUniquePayment: vi.fn(),
    } as unknown as PaymentValidator;

    const mockMemberRepository = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new CreatePaymentUseCase(
        mockPaymentRepository,
        mockPaymentValidator,
        mockMemberRepository,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validRequest: CreatePaymentRequest = {
        member_id: 'member-1',
        amount: 15000,
        month: 5,
        year: 2026,
        due_date: '2026-05-10',
    };

    it('debe lanzar error si el miembro no existe', async () => {
        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(validRequest)).rejects.toThrow(
            'El miembro especificado no existe',
        );

        expect(mockPaymentValidator.validateAmount).toHaveBeenCalledWith(15000);
        expect(mockPaymentValidator.validateMonth).toHaveBeenCalledWith(5);
        expect(mockPaymentValidator.validateYear).toHaveBeenCalledWith(2026);
        expect(mockPaymentValidator.validateDueDate).toHaveBeenCalledWith(
            '2026-05-10',
        );
        expect(mockPaymentValidator.validateUniquePayment).toHaveBeenCalledWith(
            'member-1',
            5,
            2026,
        );

        expect(mockMemberRepository.findById).toHaveBeenCalledWith('member-1');
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    it('debe crear un pago pendiente si los datos son válidos y el miembro existe', async () => {
        const createdPayment = {
            id: 'payment-1',
            member_id: 'member-1',
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            status: 'Pendiente',
            payment_date: null,
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce({
            id: 'member-1',
        } as any);

        vi.mocked(mockPaymentRepository.create).mockResolvedValueOnce(
            createdPayment as any,
        );

        const result = await useCase.execute(validRequest);

        expect(mockPaymentValidator.validateAmount).toHaveBeenCalledWith(15000);
        expect(mockPaymentValidator.validateMonth).toHaveBeenCalledWith(5);
        expect(mockPaymentValidator.validateYear).toHaveBeenCalledWith(2026);
        expect(mockPaymentValidator.validateDueDate).toHaveBeenCalledWith(
            '2026-05-10',
        );
        expect(mockPaymentValidator.validateUniquePayment).toHaveBeenCalledWith(
            'member-1',
            5,
            2026,
        );

        expect(mockMemberRepository.findById).toHaveBeenCalledWith('member-1');

        expect(mockPaymentRepository.create).toHaveBeenCalledWith({
            ...validRequest,
            due_date: new Date('2026-05-10'),
            status: 'Pendiente',
        });

        expect(result).toEqual(createdPayment);
    });

    it('debe propagar el error si falla una validación', async () => {
        vi.mocked(mockPaymentValidator.validateAmount).mockImplementationOnce(
            () => {
                throw new Error('El monto debe ser mayor a cero');
            },
        );

        await expect(useCase.execute(validRequest)).rejects.toThrow(
            'El monto debe ser mayor a cero',
        );

        expect(mockMemberRepository.findById).not.toHaveBeenCalled();
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    it('debe propagar el error si ya existe un pago para el mismo miembro, mes y año', async () => {
        vi.mocked(
            mockPaymentValidator.validateUniquePayment,
        ).mockRejectedValueOnce(
            new Error(
                'Ya existe un pago para este miembro en el mes y año especificados',
            ),
        );

        await expect(useCase.execute(validRequest)).rejects.toThrow(
            'Ya existe un pago para este miembro en el mes y año especificados',
        );

        expect(mockMemberRepository.findById).not.toHaveBeenCalled();
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });
});