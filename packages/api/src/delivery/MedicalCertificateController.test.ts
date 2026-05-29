import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MedicalCertificateController } from './MedicalCertificateController.js';

describe('MedicalCertificateController', () => {
    // Mocks de los casos de uso que el controller utiliza.
    const mockCreateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };

    const controller = new MedicalCertificateController(
        mockCreateUseCase as any,
        mockDeleteUseCase as any,
        mockUpdateUseCase as any,
        mockGetUseCase as any,
    );


    const mockReply = {
        status: vi.fn().mockReturnThis(),
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };


    const baseRequest = {
        log: {
            info: vi.fn(),
            error: vi.fn(),
        },
        params: {
            id: 'certificate-1',
        },
        body: {
            member_id: 'member-1',
            issue_date: '2026-05-01',
            expiration_date: '2027-05-01',
            file_url: 'https://example.com/certificado.pdf',
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        // primer test: verifica que create devuelve 201 cuando el caso de uso crea el certificado.
        it('debe devolver 201 y el certificado creado', async () => {
            const createdCertificate = {
                id: 'certificate-1',
                ...baseRequest.body,
            };

            mockCreateUseCase.execute.mockResolvedValueOnce(
                createdCertificate,
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockCreateUseCase.execute).toHaveBeenCalledWith(
                baseRequest.body,
            );
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: createdCertificate,
            });
        });

        // segundo test: verifica que create devuelve 400 ante validaciones de datos obligatorios.
        it('debe devolver 400 si falta informacion obligatoria', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('La fecha de emisión es obligatoria'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de emisión es obligatoria',
            });
        });

        // tercer test: verifica que create devuelve 400 si la fecha de vencimiento no es posterior.
        it('debe devolver 400 si la fecha de vencimiento no es posterior', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error(
                    'La fecha de vencimiento debe ser posterior a la de emisión',
                ),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de vencimiento debe ser posterior a la de emisión',
            });
        });

        // cuarto test: verifica que create devuelve 404 si el miembro asociado no existe.
        it('debe devolver 404 si el miembro no se encuentra registrado', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('El miembro indicado no se encuentra registrado'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El miembro indicado no se encuentra registrado',
            });
        });

        // quinto test: verifica que create devuelve 500 para errores no contemplados.
        it('debe devolver 500 ante un error no controlado', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.create(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('delete', () => {
        // sexto test: verifica que delete devuelve 204 cuando el certificado se elimina correctamente.
        it('debe devolver 204 si la eliminacion es exitosa', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(baseRequest as any, mockReply as any);

            expect(mockDeleteUseCase.execute).toHaveBeenCalledWith(
                'certificate-1',
            );
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        // séptimo test: verifica que delete devuelve 404 cuando el certificado no existe.
        it('debe devolver 404 si el certificado no se encuentra', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(
                new Error('El certificado indicado no se encuentra'),
            );

            await controller.delete(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'El certificado indicado no se encuentra',
            });
        });

        // octavo test: verifica que delete devuelve 500 para errores no contemplados.
        it('debe devolver 500 ante un error no controlado al eliminar', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.delete(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('getAll', () => {
        // noveno test: verifica que getAll devuelve 200 con la lista de certificados.
        it('debe devolver 200 y la lista de certificados medicos', async () => {
            const certificates = [
                {
                    id: 'certificate-1',
                    member_id: 'member-1',
                    issue_date: '2026-05-01',
                    expiration_date: '2027-05-01',
                },
            ];

            mockGetUseCase.execute.mockResolvedValueOnce(certificates);

            await controller.getAll(baseRequest as any, mockReply as any);

            expect(mockGetUseCase.execute).toHaveBeenCalledOnce();
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({
                data: certificates,
            });
        });

        // décimo test: verifica que getAll devuelve 500 si falla el caso de uso.
        it('debe devolver 500 si falla el listado de certificados', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.getAll(baseRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'Error interno, reintente más tarde',
            });
        });
    });

    describe('update', () => {
        // undécimo test: verifica que update devuelve 200 con el certificado actualizado.
        it('debe devolver 200 y el certificado actualizado', async () => {
            const updateBody = {
                expiration_date: '2028-05-01',
            };
            const request = {
                ...baseRequest,
                body: updateBody,
            };
            const updatedCertificate = {
                id: 'certificate-1',
                member_id: 'member-1',
                issue_date: '2026-05-01',
                expiration_date: '2028-05-01',
            };

            mockUpdateUseCase.execute.mockResolvedValueOnce(
                updatedCertificate,
            );

            await controller.update(request as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
                'certificate-1',
                updateBody,
            );
            expect(mockReply.code).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith(updatedCertificate);
        });

        // duodécimo test: verifica que update devuelve 404 si el certificado no existe.
        it('debe devolver 404 si el certificado no se encuentra registrado', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error(
                    'El certificado indicado no se encuentra registrado',
                ),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: 'El certificado indicado no se encuentra registrado',
            });
        });

        // decimotercer test: verifica que update devuelve 400 si las fechas no cumplen la regla de negocio.
        it('debe devolver 400 si la fecha de vencimiento no es posterior', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error(
                    'La fecha de vencimiento debe ser posterior a la de emisión',
                ),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                message:
                    'La fecha de vencimiento debe ser posterior a la de emisión',
            });
        });

        // decimocuarto test: verifica que update devuelve 500 para errores no contemplados.
        it('debe devolver 500 ante un error no controlado al actualizar', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('Error inesperado'),
            );

            await controller.update(baseRequest as any, mockReply as any);

            expect(mockReply.code).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({
                message: 'Error interno, reintente más tarde',
            });
        });
    });
});
