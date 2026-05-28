import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentDTO } from '@alentapp/shared';
import type { PaymentRepository } from '../PaymentRepository.js';
import { PaymentValidator } from './PaymentValidator.js';

describe('PaymentValidator', () => {
    let paymentRepo: PaymentRepository;
    let validator: PaymentValidator;

    // Fixture base de pago para reutilizar en escenarios de validación.
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

    // Setup común: repositorio mockeado y validador nuevo por cada test.
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

    // Test 1: Verifica rechazo cuando faltan campos obligatorios.
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

    // Test 2: Verifica aceptación cuando los campos obligatorios están completos.
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

    // Test 3: Verifica validación de monto mayor a cero.
    it('debe rechazar monto menor o igual a cero', () => {
        expect(() => validator.validateAmount(0)).toThrow(
            'El monto debe ser mayor a cero',
        );
        expect(() => validator.validateAmount(-1)).toThrow(
            'El monto debe ser mayor a cero',
        );
    });

    // Test 4: Verifica validación de mes en rango 1..12.
    it('debe rechazar mes fuera del rango 1 a 12', () => {
        expect(() => validator.validateMonth(0)).toThrow(
            'El mes debe estar entre 1 y 12',
        );
        expect(() => validator.validateMonth(13)).toThrow(
            'El mes debe estar entre 1 y 12',
        );
    });

    // Test 5: Verifica rechazo de año inválido.
    it('debe rechazar anio invalido', () => {
        expect(() => validator.validateYear(1899)).toThrow();
        expect(() => validator.validateYear(2026.5)).toThrow();
    });

    // Test 6: Verifica rechazo de fecha de vencimiento inválida.
    it('debe rechazar fecha de vencimiento invalida', () => {
        expect(() => validator.validateDueDate('2026-02-30')).toThrow();
        expect(() => validator.validateDueDate('30-02-2026')).toThrow();
    });

    // Test 7: Verifica rechazo de pago duplicado para socio, mes y año.
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

    // Test 8: Verifica que se permita el mismo pago al excluir su propio id.
    it('debe permitir el mismo pago cuando se excluye su id', async () => {
        vi.mocked(paymentRepo.findByMemberMonthYear).mockResolvedValueOnce(
            basePayment,
        );

        await expect(
            validator.validateUniquePayment('member-1', 5, 2026, 'payment-1'),
        ).resolves.toBeUndefined();
    });

    // Test 9: Verifica rechazo de payload de actualización vacío o inválido.
    it('debe rechazar payload de actualizacion vacio o invalido', () => {
        expect(() => validator.validateUpdatePayload(null as any)).toThrow();
        expect(() => validator.validateUpdatePayload([] as any)).toThrow();
        expect(() => validator.validateUpdatePayload({})).toThrow(
            'Debe informar al menos un campo para actualizar',
        );
    });

    // Test 10: Verifica bloqueo de actualización de campos estructurales.
    it('debe rechazar actualizacion de campos estructurales', () => {
        expect(() =>
            validator.validateUpdatePayload({ amount: 20000 } as any),
        ).toThrow('No se puede actualizar el campo amount');
        expect(() =>
            validator.validateUpdatePayload({ member_id: 'member-2' } as any),
        ).toThrow('No se puede actualizar el campo member_id');
    });

    // Test 11: Verifica validación de estados permitidos e inválidos.
    it('debe rechazar estado invalido y aceptar estado permitido', () => {
        expect(() => validator.validateStatus('Finalizado')).toThrow();
        expect(() => validator.validateStatus(undefined)).toThrow(
            'El estado es obligatorio',
        );
        expect(() => validator.validateStatus('Pagado')).not.toThrow();
    });

    // Test 12: Verifica reglas de existencia y restricciones de cancelación/actualización.
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
