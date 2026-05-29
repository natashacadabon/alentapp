import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { UpdateSportRequest } from '@alentapp/shared';

// Testeo la integración entre: Fastify -> Controller -> UseCase -> Validator

// Mockeamos el repositorio para que la API entera funcione sin conectarse a la bdd real
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    return {
        PostgresSportRepository: class {
            async findAll() { return [{ id: '1', name: 'Fútbol', description: 'Desc vieja', max_capacity: 22, additional_price: 500, requires_medical_certificate: true }]; }
            async findById(id: string) { return id === '1' ? { id: '1', name: 'Fútbol', description: 'Desc vieja', max_capacity: 22, additional_price: 500, requires_medical_certificate: true } : null; }
            async findByName(name: string) { return name === 'Fútbol Existente' ? { id: '1', name: 'Fútbol Existente' } : null; }
            async create(data: any) { return { id: '2', ...data }; }
            async update(id: string, data: any) { return { id, name: 'Fútbol', additional_price: 500, requires_medical_certificate: true, ...data }; }
            async delete(id: string) { return; }
        }
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class {
        async findAll() { return []; }
        async findById() { return null; }
        async findByDni() { return null; }
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

vi.mock('../infrastructure/PostgresLockerRepository.js', () => ({
    PostgresLockerRepository: class {
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

describe('Sport API Integration Tests - Update', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/sport', () => {

        //integration 5
        it('debe retornar 201 y crear el deporte exitosamente', async () => {
            const payload = {
                name: 'Nuevo Deporte',
                description: 'Descripción',
                max_capacity: 15,
                additional_price: 300,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sport',
                payload
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.name).toBe('Nuevo Deporte');
            expect(body.data.id).toBeDefined();
        });

        //integration 6
        it('debe retornar 409 si el nombre ya existe', async () => {
            const payload = {
                name: 'Fútbol Existente',
                description: '',
                max_capacity: 22,
                additional_price: 500,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sport',
                payload
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un deporte con ese nombre');
        });

        //integration 7
        it('debe retornar 400 si la capacidad máxima es invalida (menor o igual a cero)', async () => {
            const payload = {
                name: 'Deporte Inválido',
                description: '',
                max_capacity: 0,
                additional_price: 500,
                requires_medical_certificate: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sport',
                payload
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La capacidad máxima debe ser mayor a cero');
        });
    });


    describe('PATCH /api/v1/sport/:id', () => {

        //integration 1
        it('debe retornar 200 y el deporte actualizado', async () => {
            const payload: UpdateSportRequest = {
                description: 'Desc nueva',
                max_capacity: 30,
            };

            //simulamos la peticion HTTP internamente 
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/sport/1',
                payload
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.description).toBe('Desc nueva');
            expect(body.data.max_capacity).toBe(30);
        });

        //integration 2
        it('debe retornar 404 si el deporte no existe', async () => {
            const payload: UpdateSportRequest = {
                max_capacity: 30,
            };

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/sport/999',
                payload
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte indicado no se encuentra registrado');
        });
        
    });
});