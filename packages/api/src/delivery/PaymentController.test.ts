import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentController } from './PaymentController.js';

describe('PaymentController', () => {
    const mockCreatePaymentUseCase = {
        execute: vi.fn(),
    };

    const mockGetPaymentsUseCase = {
        execute: vi.fn(),
    };

    const mockUpdatePaymentUseCase = {
        execute: vi.fn(),
    };

    const mockDeletePaymentUseCase = {
        execute: vi.fn(),
    };

    const controller = new PaymentController(
        mockCreatePaymentUseCase as any,
        mockGetPaymentsUseCase as any,
        mockUpdatePaymentUseCase as any,
        mockDeletePaymentUseCase as any,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const baseRequest = {
        log: {
            info: vi.fn(),
            error: vi.fn(),
        },
        params: {
            id: 'payment-1',
        },
        body: {
            member_id: 'member-1',
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver 201 y el pago creado', async () => {
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

            mockCreatePaymentUseCase.execute.mockResolvedValueOnce(
                createdPayment,
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockCreatePaymentUseCase.execute).toHaveBeenCalledWith(
                baseRequest.body,
            );
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: createdPayment,
            });
        });

        it('debe devolver 400 si los datos son inválidos', async () => {
            mockCreatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('El monto debe ser mayor a cero'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El monto debe ser mayor a cero',
            });
        });

        it('debe devolver 409 si ya existe un pago para el mismo miembro, mes y año', async () => {
            mockCreatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error(
                    'Ya existe un pago para este miembro en el mes y año especificados',
                ),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Ya existe un pago para este miembro en el mes y año especificados',
            });
        });

        it('debe devolver 404 si el miembro no existe', async () => {
            mockCreatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('El miembro especificado no existe'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El miembro especificado no existe',
            });
        });

        it('debe devolver 500 ante un error no controlado', async () => {
            mockCreatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('getAll', () => {
        it('debe devolver 200 y la lista de pagos', async () => {
            const payments = [
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
            ];

            mockGetPaymentsUseCase.execute.mockResolvedValueOnce(payments);

            await controller.getAll(baseRequest as any, mockReply as any);

            expect(mockGetPaymentsUseCase.execute).toHaveBeenCalledOnce();
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: payments,
            });
        });

        it('debe devolver 500 si falla el listado de pagos', async () => {
            mockGetPaymentsUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.getAll(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('cancel', () => {
        it('debe devolver 200 y el pago cancelado', async () => {
            const canceledPayment = {
                id: 'payment-1',
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10',
                status: 'Cancelado',
                payment_date: null,
            };

            mockDeletePaymentUseCase.execute.mockResolvedValueOnce(
                canceledPayment,
            );

            await controller.cancel(baseRequest as any, mockReply as any);

            expect(mockDeletePaymentUseCase.execute).toHaveBeenCalledWith(
                'payment-1',
            );
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: canceledPayment,
            });
        });

        it('debe devolver 404 si el pago no existe', async () => {
            mockDeletePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Pago no encontrado'),
            );

            await controller.cancel(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Pago no encontrado',
            });
        });

        it('debe devolver 409 si el pago ya está cancelado', async () => {
            mockDeletePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('El pago ya se encuentra cancelado'),
            );

            await controller.cancel(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El pago ya se encuentra cancelado',
            });
        });

        it('debe devolver 500 ante un error no controlado al cancelar', async () => {
            mockDeletePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.cancel(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('update', () => {
        it('debe devolver 200 y el pago actualizado', async () => {
            const request = {
                ...baseRequest,
                body: {
                    status: 'Pagado',
                    payment_date: '2026-05-10',
                },
            };

            const updatedPayment = {
                id: 'payment-1',
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10',
                status: 'Pagado',
                payment_date: '2026-05-10',
            };

            mockUpdatePaymentUseCase.execute.mockResolvedValueOnce(
                updatedPayment,
            );

            await controller.update(request as any, mockReply as any);

            expect(mockUpdatePaymentUseCase.execute).toHaveBeenCalledWith(
                'payment-1',
                request.body,
            );
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: updatedPayment,
            });
        });

        it('debe devolver 400 si el estado es inválido', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Estado inválido'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Estado inválido',
            });
        });

        it('debe devolver 400 si se intenta actualizar un campo estructural', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede actualizar el campo amount'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'No se puede actualizar el campo amount',
            });
        });

        it('debe devolver 404 si el pago no existe', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Pago no encontrado'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Pago no encontrado',
            });
        });

        it('debe devolver 409 si el pago cancelado no puede actualizarse', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede actualizar un pago cancelado'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'No se puede actualizar un pago cancelado',
            });
        });

        it('debe devolver 409 si el pago pagado no puede actualizarse', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede actualizar un pago ya pagado'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'No se puede actualizar un pago ya pagado',
            });
        });

        it('debe devolver 500 ante un error no controlado al actualizar', async () => {
            mockUpdatePaymentUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });
});