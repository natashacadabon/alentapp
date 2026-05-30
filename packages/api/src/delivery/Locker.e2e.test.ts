import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

// Agrupamos todos los tests E2E 
describe('Locker API End-to-End Tests', () => {

    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let firstLockerId: string;
    let secondLockerId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();

    // Definimos un DNI único para el socio de prueba.
    const testDni = `LK${randomSuffix}`;
    // Definimos un email único para el socio de prueba.
    const testEmail = `locker-${randomSuffix}@e2e.com`;

    beforeAll(async () => {
        // Construimos la app completa.
        app = buildApp();

        await app.ready();

        // Creamos un cliente Prisma independiente para preparar y validar datos reales.
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as string),
        });

        // Abrimos la conexión con la base de datos.
        await prisma.$connect();

        // Creamos un socio real porque un locker puede estar asociado a un miembro.
        const member = await prisma.member.create({
            data: {
                dni: testDni,
                name: 'Socio Locker E2E',
                email: testEmail,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });

        // Guardamos el id para usarlo en los payloads de lockers.
        createdMemberId = member.id;
    });

    
    afterAll(async () => {
        // Borramos cualquier locker que haya quedado asociado al socio de prueba o creado en tests.
        if (firstLockerId) {
            await prisma.locker.deleteMany({
                where: { id: firstLockerId },
            });
        }

        if (secondLockerId) {
            await prisma.locker.deleteMany({
                where: { id: secondLockerId },
            });
        }

        // Borramos el socio de prueba para no ensuciar la base.
        if (createdMemberId) {
            await prisma.member.deleteMany({
                where: { id: createdMemberId },
            });
        }

        // Cerramos la conexión directa de Prisma.
        await prisma.$disconnect();

        // Cerramos la app Fastify.
        await app.close();
    });

    // Primer test: verifica que el endpoint de listado responda correctamente.
    it('1. GET: Debe retornar la lista de lockers', async () => {
        // Ejecutamos una request real contra la ruta de listado.
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers',
        });

        // Validamos que la API responda OK.
        expect(response.statusCode).toBe(200);

        // Convertimos la respuesta JSON en objeto.
        const body = JSON.parse(response.payload);

        // El controller devuelve la lista dentro de la propiedad data.
        expect(Array.isArray(body.data)).toBe(true);
    });

    // Segundo test: verifica que se pueda crear un locker en la base real.
    it('2. POST: Debe crear un locker en la base de datos real', async () => {
        // Armamos un payload válido.
        const payload = {
            number: 9998,
            location: 'Vestuario Principal E2E',
        };

        // Ejecutamos una request real contra la ruta de creación.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        // Validamos que la API haya creado el recurso.
        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);

        // Guardamos el id para usarlo en tests posteriores y en limpieza.
        firstLockerId = body.data.id;

        // Validamos la estructura principal devuelta por el endpoint.
        expect(body.data).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                number: 9998,
                location: 'Vestuario Principal E2E',
                status: 'Disponible',
                member_id: null,
            }),
        );

        // Consultamos la base real para confirmar que el locker fue persistido.
        const dbLocker = await prisma.locker.findUnique({
            where: { id: firstLockerId },
        });

        // Confirmamos que el registro existe en PostgreSQL.
        expect(dbLocker).not.toBeNull();

        // Confirmamos que tiene los datos correctos.
        expect(dbLocker?.number).toBe(9998);
        expect(dbLocker?.location).toBe('Vestuario Principal E2E');
    });

    // Tercer test: verifica que se rechace un locker con número duplicado.
    it('3. POST: Debe fallar si el número de locker ya existe', async () => {
        // Armamos un payload con el mismo número que el locker anterior.
        const payload = {
            number: 9998,
            location: 'Vestuario Secundario',
        };

        // Ejecutamos la request duplicada.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        // Validamos que la API rechace el duplicado (conflicto).
        expect(response.statusCode).toBe(409);

        // Parseamos el error devuelto.
        const body = JSON.parse(response.payload);

        // Validamos que el mensaje corresponda a la regla de número único.
        expect(body.error).toContain('existe un Locker con ese número');
    });

    // Cuarto test: verifica que se pueda editar un locker existente.
    it('4. PATCH: Debe actualizar un locker existente', async () => {
        // Armamos el payload con nuevos datos.
        const payload = {
            location: 'Vestuario Principal E2E - Sector A',
            status: 'Mantenimiento',
        };

        // Ejecutamos la actualización.
        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/lockers/${firstLockerId}`,
            payload,
        });

        // Validamos que la API haya actualizado el recurso.
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);

        // Validamos que los datos fueron actualizados.
        expect(body.data).toEqual(
            expect.objectContaining({
                id: firstLockerId,
                location: 'Vestuario Principal E2E - Sector A',
                status: 'Mantenimiento',
            }),
        );

        // Consultamos la base para confirmar la persistencia.
        const dbLocker = await prisma.locker.findUnique({
            where: { id: firstLockerId },
        });

        expect(dbLocker?.location).toBe('Vestuario Principal E2E - Sector A');
        expect(dbLocker?.status).toBe('Mantenimiento');
    });

    // Quinto test: verifica que se pueda asignar un locker a un miembro.
    it('5. PATCH: Debe asignar un locker a un miembro existente', async () => {
        // Armamos el payload para asignar el locker al miembro.
        const payload = {
            member_id: createdMemberId,
            status: 'Ocupado',
        };

        // Ejecutamos la actualización.
        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/lockers/${firstLockerId}`,
            payload,
        });

        // Validamos que la API haya actualizado el recurso.
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);

        // Validamos que el locker está asignado al miembro.
        expect(body.data.member_id).toBe(createdMemberId);
        expect(body.data.status).toBe('Ocupado');

        // Consultamos la base para confirmar.
        const dbLocker = await prisma.locker.findUnique({
            where: { id: firstLockerId },
        });

        expect(dbLocker?.member_id).toBe(createdMemberId);
    });

    // Sexto test: verifica que se rechace la asignación a un miembro inexistente.
    it('6. PATCH: Debe fallar si el miembro indicado no existe', async () => {
        // Creamos un segundo locker para este test.
        const payload = {
            number: 9999,
            location: 'Vestuario Secundario E2E',
        };

        const createResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        const createBody = JSON.parse(createResponse.payload);
        secondLockerId = createBody.data.id;

        // Ahora intentamos asignarlo a un miembro que no existe.
        const updatePayload = {
            member_id: '00000000-0000-0000-0000-000000000000',
        };

        const response = await app.inject({
            method: 'PATCH',
            url: `/api/v1/lockers/${secondLockerId}`,
            payload: updatePayload,
        });

        // Validamos que la API rechace la asignación inválida.
        expect(response.statusCode).toBe(400);

        // Parseamos la respuesta de error.
        const body = JSON.parse(response.payload);

        // Validamos que la API devuelva un error de validación.
        expect(typeof body.error).toBe('string');
    });

    // Séptimo test: verifica que se pueda eliminar un locker.
    it('7. DELETE: Debe eliminar un locker existente', async () => {
        // Ejecutamos el borrado del segundo locker creado.
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${secondLockerId}`,
        });

        // Validamos que la API responda No Content.
        expect(response.statusCode).toBe(204);

        // Consultamos la base para confirmar el borrado lógico.
        const dbLocker = await prisma.locker.findUnique({
            where: { id: secondLockerId },
        });

        // Confirmamos que quedó marcado como eliminado.
        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.deleted_at).not.toBeNull();
    });

    // Octavo test: verifica que se rechace el borrado de un locker inexistente.
    it('8. DELETE: Debe fallar si el locker indicado no existe', async () => {
        // Ejecutamos el borrado de un locker inexistente.
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/lockers/locker-inexistente',
        });

        // Validamos que la API responda Not Found.
        expect(response.statusCode).toBe(404);

        // Parseamos la respuesta de error.
        const body = JSON.parse(response.payload);

        // Validamos el mensaje.
        expect(body.error).toContain('no existe');
    });
});
