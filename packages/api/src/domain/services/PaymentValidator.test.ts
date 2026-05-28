import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentDTO } from '@alentapp/shared';
import type { PaymentRepository } from '../PaymentRepository.js';
import { PaymentValidator } from './PaymentValidator.js';

describe('PaymentValidator', () => {
    let paymentRepo: PaymentRepository;
    let validator: PaymentValidator;

    const basePayment: PaymentDTO = {
        id: 'payment-1',
        member_id: 'member-1',
        amount: 15000,
        month: 5,
        year: 2026,
        due_date: '2026-06-01',
        payment_date: null,
        status: 'Pendiente',
    };

    beforeEach(() => {
        paymentRepo = {
            create: vi.fn(),
            findById: vi.fn(),
            findByMemberId: vi.fn(),
            findAll: vi.fn(),
            findByMemberMonthYear: vi.fn(),
            cancel: vi.fn(),
            update: vi.fn(),
        } as unknown as PaymentRepository;

        validator = new PaymentValidator(paymentRepo);
    });

    it('debe rechazar si faltan campos obligatorios', () => {
        expect(() =>
            validator.validateFields({
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
            }),
        ).toThrow('Faltan campos obligatorios');
    });

    it('debe aceptar campos obligatorios completos', () => {
        expect(() =>
            validator.validateFields({
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-06-01',
            }),
        ).not.toThrow();
    });

    it('debe rechazar monto menor o igual a cero', () => {
        expect(() => validator.validateAmount(0)).toThrow(
            'El monto debe ser mayor a cero',
        );
        expect(() => validator.validateAmount(-1)).toThrow(
            'El monto debe ser mayor a cero',
        );
    });

    it('debe rechazar mes fuera del rango 1 a 12', () => {
        expect(() => validator.validateMonth(0)).toThrow(
            'El mes debe estar entre 1 y 12',
        );
        expect(() => validator.validateMonth(13)).toThrow(
            'El mes debe estar entre 1 y 12',
        );
    });

    it('debe rechazar anio invalido', () => {
        expect(() => validator.validateYear(1899)).toThrow();
        expect(() => validator.validateYear(2026.5)).toThrow();
    });

    it('debe rechazar fecha de vencimiento invalida', () => {
        expect(() => validator.validateDueDate('2026-02-30')).toThrow();
        expect(() => validator.validateDueDate('30-02-2026')).toThrow();
    });

    it('debe rechazar pago duplicado para el mismo socio, mes y anio', async () => {
        vi.mocked(paymentRepo.findByMemberMonthYear).mockResolvedValueOnce(
            basePayment,
        );

        await expect(
            validator.validateUniquePayment('member-1', 5, 2026),
        ).rejects.toThrow();

        expect(paymentRepo.findByMemberMonthYear).toHaveBeenCalledWith(
            'member-1',
            5,
            2026,
        );
    });

    it('debe permitir el mismo pago cuando se excluye su id', async () => {
        vi.mocked(paymentRepo.findByMemberMonthYear).mockResolvedValueOnce(
            basePayment,
        );

        await expect(
            validator.validateUniquePayment('member-1', 5, 2026, 'payment-1'),
        ).resolves.toBeUndefined();
    });

    it('debe rechazar payload de actualizacion vacio o invalido', () => {
        expect(() => validator.validateUpdatePayload(null as any)).toThrow();
        expect(() => validator.validateUpdatePayload([] as any)).toThrow();
        expect(() => validator.validateUpdatePayload({})).toThrow(
            'Debe informar al menos un campo para actualizar',
        );
    });

    it('debe rechazar actualizacion de campos estructurales', () => {
        expect(() =>
            validator.validateUpdatePayload({ amount: 20000 } as any),
        ).toThrow('No se puede actualizar el campo amount');
        expect(() =>
            validator.validateUpdatePayload({ member_id: 'member-2' } as any),
        ).toThrow('No se puede actualizar el campo member_id');
    });

    it('debe rechazar estado invalido y aceptar estado permitido', () => {
        expect(() => validator.validateStatus('Finalizado')).toThrow();
        expect(() => validator.validateStatus(undefined)).toThrow(
            'El estado es obligatorio',
        );
        expect(() => validator.validateStatus('Pagado')).not.toThrow();
    });

    it('debe validar existencia y reglas de cancelacion o actualizacion', () => {
        expect(() => validator.validatePaymentExists(null)).toThrow(
            'Pago no encontrado',
        );
        expect(() =>
            validator.validatePaymentCanBeCanceled({
                ...basePayment,
                status: 'Cancelado',
            }),
        ).toThrow('El pago ya se encuentra cancelado');
        expect(() =>
            validator.validatePaymentCanBeUpdated({
                ...basePayment,
                status: 'Cancelado',
            }),
        ).toThrow('No se puede actualizar un pago cancelado');
    });
});
