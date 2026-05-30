import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { CreateMedicalCertificateRequest } from '@alentapp/shared';
import { buildApp } from '../app.js';

// Definimos DATABASE_URL para que los repositorios no mockeados que instancia buildApp no fallen al importar.
vi.hoisted(() => {
    process.env.DATABASE_URL =
        'postgres://admin:password123@localhost:5432/alentapp_test';
});

// Mock del repositorio de socios: permite que el caso de uso valide member_id sin usar DB real.
vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                if (id !== 'member-1') return null;

                return {
                    id: 'member-1',
                    dni: '12345678',
                    name: 'Juan Perez',
                    email: 'juan@test.com',
                    birthdate: '1990-01-01',
                    category: 'Pleno',
                    status: 'Activo',
                    created_at: '2026-05-29',
                };
            }

            async findAll() {
                return [];
            }

            async findByDni() {
                return null;
            }

            async create(data: any) {
                return { id: 'member-1', ...data };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

// Mock del repositorio de certificados: controla respuestas para probar Fastify -> Controller -> UseCase.
vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
    return {
        PostgresMedicalCertificateRepository: class {
            async findAll() {
                return [
                    {
                        id: 'certificate-1',
                        member_id: 'member-1',
                        issue_date: '2026-05-01',
                        expiry_date: '2027-05-01',
                        doctor_license: 'MP123456',
                        is_validated: true,
                    },
                ];
            }

            async findById(id: string) {
                if (id !== 'certificate-1') return null;

                return {
                    id: 'certificate-1',
                    member_id: 'member-1',
                    issue_date: '2026-05-01',
                    expiry_date: '2027-05-01',
                    doctor_license: 'MP123456',
                    is_validated: true,
                };
            }

            async findActiveByMemberId(member_id: string) {
                if (member_id !== 'member-1') return null;

                return {
                    id: 'certificate-1',
                    member_id,
                    issue_date: '2026-05-01',
                    expiry_date: '2027-05-01',
                    doctor_license: 'MP123456',
                    is_validated: true,
                };
            }

            async invalidate() {
                return;
            }

            async createReplacingActive(data: any) {
                return {
                    id: 'certificate-2',
                    member_id: data.member_id,
                    issue_date: data.issue_date,
                    expiry_date: data.expiry_date,
                    doctor_license: data.doctor_license,
                    is_validated: true,
                };
            }

            async update(id: string, data: any) {
                return {
                    id: 'certificate-1',
                    member_id: id,
                    issue_date: data.issue_date ?? '2026-05-01',
                    expiry_date: data.expiry_date ?? '2027-12-10',
                    doctor_license: data.doctor_license ?? 'MP999999',
                    is_validated: true,
                };
            }

            async delete() {
                return;
            }
        },
    };
});

// Mock de deportes: buildApp lo instancia, pero esta suite no prueba deportes.
vi.mock('../infrastructure/PostgresSportRepository.js', () => ({
    PostgresSportRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async findByName() {
            return null;
        }
        async create(data: any) {
            return { id: 'sport-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async delete() {
            return;
        }
    },
}));

// Mock de pagos: evita inicializar acceso real a DB para endpoints no cubiertos.
vi.mock('../infrastructure/PostgresPaymentRepository.js', () => ({
    PostgresPaymentRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async findByMemberMonthYear() {
            return null;
        }
        async create(data: any) {
            return { id: 'payment-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async cancel(id: string) {
            return { id, status: 'Cancelado' };
        }
    },
}));

// Mock de lockers: buildApp lo instancia, pero no forma parte de esta prueba.
vi.mock('../infrastructure/PostgresLockerRepository.js', () => ({
    PostgresLockerRepository: class {
        async findAll() {
            return [];
        }
        async findById() {
            return null;
        }
        async findByNumber() {
            return null;
        }
        async create(data: any) {
            return { id: 'locker-1', ...data };
        }
        async update(id: string, data: any) {
            return { id, ...data };
        }
        async delete() {
            return;
        }
    },
}));

describe('MedicalCertificate API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        // Construye la app real con rutas, controllers y use cases.
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        // Cierra Fastify para no dejar handles abiertos.
        await app.close();
    });

    // Primer test: verifica creación exitosa atravesando endpoint, controller y use case.
    it('debe crear un certificado médico correctamente', async () => {
        const payload: CreateMedicalCertificateRequest = {
            issue_date: '2026-05-01',
            expiry_date: '2026-12-01',
            doctor_license: 'MP123456',
            member_id: 'member-1',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data).toEqual(
            expect.objectContaining({
                id: 'certificate-2',
                doctor_license: 'MP123456',
                is_validated: true,
                member_id: 'member-1',
            }),
        );
    });

    // Segundo test: verifica listado exitoso con formato { data: [...] }.
    it('debe listar los certificados médicos', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/medicalcertificate',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body.data).toBeInstanceOf(Array);
        expect(body.data[0]).toEqual(
            expect.objectContaining({
                id: 'certificate-1',
                member_id: 'member-1',
                doctor_license: 'MP123456',
            }),
        );
    });

    // Tercer test: verifica actualización exitosa del certificado activo del socio indicado.
    it('debe actualizar un certificado médico existente', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/medicalcertificate/member-1',
            payload: {
                issue_date: '2026-05-10',
                expiry_date: '2026-12-10',
                doctor_license: 'MP999999',
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);

        expect(body).toEqual(
            expect.objectContaining({
                id: 'certificate-1',
                member_id: 'member-1',
                doctor_license: 'MP999999',
            }),
        );
    });

    // Cuarto test: verifica eliminación exitosa de un certificado existente.
    it('debe eliminar un certificado médico existente', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/medicalcertificate/certificate-1',
        });

        expect(response.statusCode).toBe(204);
        expect(response.payload).toBe('');
    });

    // Quinto test: verifica error de validación cuando las fechas no respetan la regla de negocio.
    it('debe devolver error si la fecha de vencimiento no es posterior a la fecha de emisión', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload: {
                issue_date: '2026-12-01',
                expiry_date: '2026-05-01',
                doctor_license: 'MP123456',
                member_id: 'member-1',
            },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);

        expect(body.error).toContain('posterior');
    });

    // Sexto test: verifica error cuando se intenta eliminar un certificado inexistente.
    it('debe devolver error si se intenta eliminar un certificado médico inexistente', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/medicalcertificate/id-inexistente',
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);

        expect(body.error).toContain('El certificado indicado no se encuentra');
    });
});
