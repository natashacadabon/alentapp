import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { CreatePaymentRequest } from '@alentapp/shared';
import { buildApp } from '../app.js';

// Define una URL de base de datos de test para el entorno de integración.
vi.hoisted(() => {
    process.env.DATABASE_URL =
        'postgres://admin:password123@localhost:5432/alentapp_test';
});

// Mock del repositorio de socios para aislar la prueba del acceso real a DB.
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
                    created_at: '2026-05-28',
                };
            }
        },
    };
});

// Mock del repositorio de pagos para controlar reglas y respuesta de creación.
vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            async findByMemberMonthYear(
                member_id: string,
                month: number,
                year: number,
            ) {
                if (
                    member_id === 'member-1' &&
                    month === 6 &&
                    year === 2026
                ) {
                    return {
                        id: 'payment-duplicado',
                        member_id,
                        amount: 15000,
                        month,
                        year,
                        due_date: '2026-06-01',
                        payment_date: null,
                        status: 'Pendiente',
                    };
                }

                return null;
            }

            async create(data: CreatePaymentRequest) {
                return {
                    id: 'payment-1',
                    member_id: data.member_id,
                    amount: data.amount,
                    month: data.month,
                    year: data.year,
                    due_date:
                        data.due_date instanceof Date
                            ? data.due_date.toISOString()
                            : data.due_date,
                    payment_date: null,
                    status: 'Pendiente',
                };
            }

            async findAll() {
                return [
                    {
                        id: 'payment-1',
                        member_id: 'member-1',
                        amount: 15000,
                        month: 5,
                        year: 2026,
                        due_date: '2026-06-01',
                        payment_date: null,
                        status: 'Pendiente',
                        member: {
                            name: 'Juan Perez',
                            dni: '12345678',
                        },
                    },
                ];
            }

            async findById(id: string) {
                if (id !== 'payment-1') return null;

                return {
                    id: 'payment-1',
                    member_id: 'member-1',
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    due_date: '2099-06-01',
                    payment_date: null,
                    status: 'Pendiente',
                };
            }

            async update(id: string, data: any) {
                return {
                    id,
                    member_id: 'member-1',
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    due_date: '2099-06-01',
                    payment_date: data.payment_date,
                    status: data.status,
                };
            }
        },
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    // Inicializa la app Fastify una vez para todo el bloque de pruebas.
    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    // Cierra recursos al terminar para evitar handles abiertos.
    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/payments', () => {
        // Test 1: Verifica alta exitosa y valores por defecto del pago creado.
        it('debe crear un pago correctamente con estado Pendiente y payment_date null', async () => {
            //  payload válido para un socio existente.
            const payload: CreatePaymentRequest = {
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-06-01',
            };

            // invoca el endpoint real con inyección HTTP de Fastify.
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            // creación exitosa.
            expect(response.statusCode).toBe(201);

            // Parseo del body para validar la estructura de respuesta.
            const body = JSON.parse(response.payload);

            // valida datos persistidos y valores por defecto de dominio.
            expect(body.data).toEqual({
                id: 'payment-1',
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-06-01T00:00:00.000Z',
                payment_date: null,
                status: 'Pendiente',
            });
        });

        // Test 2: Verifica que no se cree el pago si el socio asociado no existe.
        it('debe retornar 404 si el miembro no existe', async () => {
            // payload con member_id inexistente.
            const payload: CreatePaymentRequest = {
                member_id: 'member-inexistente',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-06-01',
            };

            // invoca el endpoint de creación.
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            // error esperado por recurso relacionado inexistente.
            expect(response.statusCode).toBe(404);

            // mensaje de error de negocio esperado.
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El miembro especificado no existe');
        });

        // Test 3: Verifica que no se permita duplicar socio, mes y año.
        it('debe retornar 409 si ya existe un pago para el mismo socio, mes y año', async () => {
            //payload que coincide con el mock de pago duplicado para member-1, mes 6 y año 2026.
            const payload: CreatePaymentRequest = {
                member_id: 'member-1',
                amount: 15000,
                month: 6,
                year: 2026,
                due_date: '2026-06-01',
            };
            // invoca el endpoint de creación.
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });
            // error esperado por regla de negocio de pago único por socio, mes y año.
            expect(response.statusCode).toBe(409);
            // mensaje de error de negocio esperado.
            const body = JSON.parse(response.payload);
            expect(body.error).toBe(
                'Ya existe un pago para este miembro en el mes y año especificados',
            );
        });
    });

    describe('GET /api/v1/payments', () => {
        // Test 4: Verifica listado exitoso de pagos existentes.
        it('debe retornar 200 y el listado de pagos', async () => {
            // invoca el endpoint de listado de pagos.
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/payments',
            });
            // respuesta exitosa.
            expect(response.statusCode).toBe(200);
            // parseo del body para validar estructura de respuesta.
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0]).toEqual(
                expect.objectContaining({
                    id: 'payment-1',
                    member_id: 'member-1',
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    payment_date: null,
                    status: 'Pendiente',
                    member: {
                        name: 'Juan Perez',
                        dni: '12345678',
                    },
                }),
            );
        });
    });

    describe('PATCH /api/v1/payments/:id', () => {
        // Test 5: Verifica actualizacion exitosa a estado Pagado.
        it('debe actualizar un pago a Pagado y completar payment_date', async () => {
            // invoca el endpoint de actualización para cambiar el estado a Pagado.
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/payment-1',
                payload: {
                    status: 'Pagado',
                },
            });
            // respuesta exitosa.
            expect(response.statusCode).toBe(200);
            // parseo del body para validar estructura de respuesta y campos actualizados.
            const body = JSON.parse(response.payload);
            expect(body.data).toEqual(
                expect.objectContaining({
                    id: 'payment-1',
                    member_id: 'member-1',
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    status: 'Pagado',
                }),
            );
            // verifica que la fecha de pago se haya completado correctamente.
            expect(body.data.payment_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});
