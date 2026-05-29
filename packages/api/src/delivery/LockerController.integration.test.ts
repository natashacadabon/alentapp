import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { UpdateLockerRequest } from '@alentapp/shared';

// Testeo la integración entre: Fastify -> Controller -> UseCase -> Validator

// Mockeamos el repositorio para que la API entera funcione sin conectarse a la BD real
vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() {
                return [
                    {
                        id: '1',
                        number: 1,
                        location: 'Vestuario A',
                        status: 'Disponible',
                        member_id: null,
                    },
                ];
            }
            async findById(id: string) {
                if (id === '1') return { id: '1', number: 1, location: 'Vestuario A', status: 'Disponible', member_id: null };
                if (id === 'ocupado') return { id: 'ocupado', number: 2, location: 'Vestuario B', status: 'Ocupado', member_id: 'member-1' };
                if (id === 'mantenimiento') return { id: 'mantenimiento', number: 3, location: 'Vestuario C', status: 'Mantenimiento', member_id: null };
                return null;
            }
            async findByNumber(number: number) {
                return number === 99 ? { id: '99', number: 99, location: 'Vestuario X', status: 'Disponible', member_id: null } : null;
            }
            async create(data: any) { return { id: '2', ...data }; }
            async update(id: string, data: any) { return { id, number: 1, location: 'Vestuario A', status: 'Disponible', member_id: null, ...data }; }
            async delete(_id: string) { return; }
        }
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class {
        async findAll() { return []; }
        async findById(id: string) {
            return id === 'member-1' ? { id: 'member-1', name: 'Juan Pérez', dni: '12345678' } : null;
        }
        async findByDni() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    }
}));

vi.mock('../infrastructure/PostgresSportRepository.js', () => ({
    PostgresSportRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async findByName() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    }
}));

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => ({
    PostgresPaymentRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    }
}));

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => ({
    PostgresMedicalCertificateRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async create(data: any) { return { id: '1', ...data }; }
        async update(id: string, data: any) { return { id, ...data }; }
        async delete() { return; }
    }
}));

describe('Locker API Integration Tests (TDD_0002)', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    // ─────────────────────────────────────────────
    // PATCH /api/v1/lockers/:id
    // ─────────────────────────────────────────────
    describe('PATCH /api/v1/lockers/:id', () => {

        // integration 1
        it('debe retornar 200 y el locker actualizado cuando el payload es válido', async () => {
            const payload: UpdateLockerRequest = {
                location: 'Vestuario A - Fila 1',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/1',
                payload,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.location).toBe('Vestuario A - Fila 1');
        });

        // integration 2
        it('debe retornar 404 si el locker no existe', async () => {
            const payload: UpdateLockerRequest = {
                location: 'Vestuario Z',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/999',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El Locker no existe');
        });

        // integration 3
        it('debe retornar 409 si se intenta asignar un locker en mantenimiento', async () => {
            const payload: UpdateLockerRequest = {
                member_id: 'member-1',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/mantenimiento',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El Locker está en mantenimiento y no puede asignarse');
        });

        // integration 4
        it('debe retornar 409 si se intenta pasar a mantenimiento un locker ocupado', async () => {
            const payload: UpdateLockerRequest = {
                status: 'Mantenimiento',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/ocupado',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('No se puede poner en mantenimiento un Locker ocupado. Desasigná el socio primero');
        });

        // integration 5
        it('debe retornar 409 si se intenta reasignar un locker ya ocupado a otro socio', async () => {
            const payload: UpdateLockerRequest = {
                member_id: 'member-2',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/ocupado',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El Locker ya se encuentra ocupado');
        });

        // integration 6
        it('debe retornar 409 si el nuevo número ya pertenece a otro locker', async () => {
            const payload: UpdateLockerRequest = {
                number: 99,
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/1',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un Locker con ese número');
        });

        // integration 7
        it('debe retornar 400 si el socio asignado no existe', async () => {
            const payload: UpdateLockerRequest = {
                member_id: 'member-no-existe',
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/lockers/1',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio no existe');
        });
    });
});
