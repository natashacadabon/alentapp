import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockerController } from './LockerController.js';

describe('LockerController', () => {
    // 1. Mocks de los Casos de Uso
    const mockCreateUseCase = { execute: vi.fn() };
    const mockGetAllUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };

    const controller = new LockerController(
        mockCreateUseCase as any,
        mockGetAllUseCase as any,
        mockUpdateUseCase as any,
        mockDeleteUseCase as any,
    );

    // 2. Mocks de Fastify Request y Reply
    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const mockRequest = {
        body: { number: 5, location: 'Vestuario A' },
        params: { id: '1' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─────────────────────────────────────────────
    // GET ALL
    // ─────────────────────────────────────────────
    describe('getAll', () => {
        it('debe devolver 200 y la lista de lockers', async () => {
            const mockLockers = [
                { id: '1', number: 1, location: 'Vestuario A', status: 'Disponible', member_id: null },
            ];
            mockGetAllUseCase.execute.mockResolvedValueOnce(mockLockers);

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLockers });
        });

        it('debe devolver 500 si el caso de uso falla', async () => {
            mockGetAllUseCase.execute.mockRejectedValueOnce(new Error('DB caída'));

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────
    describe('create', () => {
        it('debe devolver 201 y el locker creado', async () => {
            const mockLocker = { id: '2', number: 5, location: 'Vestuario A', status: 'Disponible', member_id: null };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockLocker);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver 409 si el número de locker ya existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Ya existe un Locker con ese número'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un Locker con ese número' });
        });

        it('debe devolver 400 si el número no es positivo', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El número debe ser positivo'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe devolver 400 si el socio asignado no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver 500 ante un error genérico', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Fallo inesperado'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    // ─────────────────────────────────────────────
    // UPDATE (TDD_0002)
    // ─────────────────────────────────────────────
    describe('update', () => {
        it('debe devolver 200 y el locker actualizado', async () => {
            const mockLocker = { id: '1', number: 5, location: 'Vestuario B', status: 'Disponible', member_id: null };
            mockUpdateUseCase.execute.mockResolvedValueOnce(mockLocker);

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('1', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver 404 si el locker no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El Locker no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El Locker no existe' });
        });

        it('debe devolver 409 si el locker está en mantenimiento', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('El Locker está en mantenimiento y no puede asignarse'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El Locker está en mantenimiento y no puede asignarse',
            });
        });

        it('debe devolver 409 si se intenta poner en mantenimiento con socio asignado', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede poner en mantenimiento un Locker ocupado. Desasigná el socio primero'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
        });

        it('debe devolver 409 si el locker ya está ocupado por otro socio', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El Locker ya se encuentra ocupado'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El Locker ya se encuentra ocupado' });
        });

        it('debe devolver 409 si el nuevo número ya pertenece a otro locker', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Ya existe un Locker con ese número'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un Locker con ese número' });
        });

        it('debe devolver 400 si el socio asignado no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver 400 si no se informa ningún campo para actualizar', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('Debe informar al menos un campo para actualizar'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Debe informar al menos un campo para actualizar',
            });
        });

        it('debe devolver 500 ante un error genérico', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Fallo inesperado'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    // ─────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────
    describe('delete', () => {
        it('debe devolver 204 si se elimina correctamente', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver 404 si el locker no existe', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('El Locker no existe'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El Locker no existe' });
        });

        it('debe devolver 409 si el locker tiene un socio asignado', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(
                new Error('No se puede eliminar un Locker con un socio asignado'),
            );

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'No se puede eliminar un Locker con un socio asignado',
            });
        });

        it('debe devolver 500 ante un error genérico', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('Fallo inesperado'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});
