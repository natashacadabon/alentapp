
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

// Agrupamos todos los tests E2E 
describe('MedicalCertificate API End-to-End Tests', () => {

    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let firstCertificateId: string;
    let activeCertificateId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();

    // Definimos un DNI único para el socio de prueba.
    const testDni = `MC${randomSuffix}`;
    // Definimos un email único para el socio de prueba.
    const testEmail = `medical-certificate-${randomSuffix}@e2e.com`;

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

        // Creamos un socio real porque un certificado médico siempre necesita member_id.
        const member = await prisma.member.create({
            data: {
                dni: testDni,
                name: 'Socio Certificado E2E',
                email: testEmail,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });

        // Guardamos el id para usarlo en los payloads de certificados.
        createdMemberId = member.id;
    });

    
    afterAll(async () => {
        // Borramos cualquier certificado que haya quedado asociado al socio de prueba.
        if (createdMemberId) {
            await prisma.medicalCertificate.deleteMany({
                where: { member_id: createdMemberId },
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
    it('1. GET: Debe retornar la lista de certificados médicos', async () => {
        // Ejecutamos una request real contra la ruta de listado.
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/medicalcertificate',
        });

        // Validamos que la API responda OK.
        expect(response.statusCode).toBe(200);

        // Convertimos la respuesta JSON en objeto.
        const body = JSON.parse(response.payload);

        // El controller devuelve la lista dentro de la propiedad data.
        expect(Array.isArray(body.data)).toBe(true);
    });

    // Segundo test: verifica que se pueda crear un certificado médico en la base real.
    it('2. POST: Debe crear un certificado médico en la base de datos real', async () => {
        // Armamos un payload válido asociado al socio creado en beforeAll.
        const payload = {
            member_id: createdMemberId,
            issue_date: '2026-05-01',
            expiry_date: '2027-05-01',
            doctor_license: 'MP-12345',
        };

        // Ejecutamos una request real contra la ruta de creación.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload,
        });

        // Validamos que la API haya creado el recurso.
        expect(response.statusCode).toBe(201);


        const body = JSON.parse(response.payload);

        // Guardamos el id para usarlo en tests posteriores y en limpieza.
        firstCertificateId = body.data.id;
        activeCertificateId = body.data.id;

        // Validamos la estructura principal devuelta por el endpoint.
        expect(body.data).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                member_id: createdMemberId,
                doctor_license: 'MP-12345',
                is_validated: true,
            }),
        );

        // Consultamos la base real para confirmar que el certificado fue persistido.
        const dbCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: firstCertificateId },
        });

        // Confirmamos que el registro existe en PostgreSQL.
        expect(dbCertificate).not.toBeNull();

        // Confirmamos que quedó asociado al socio correcto.
        expect(dbCertificate?.member_id).toBe(createdMemberId);
    });

    // Tercer test: verifica que un nuevo certificado invalide el certificado activo anterior del mismo socio.
    it('3. POST: Debe invalidar el certificado activo anterior al crear uno nuevo', async () => {
        // Armamos un segundo certificado válido para el mismo socio.
        const payload = {
            member_id: createdMemberId,
            issue_date: '2027-06-01',
            expiry_date: '2028-06-01',
            doctor_license: 'MP-67890',
        };

        // Ejecutamos la creación del nuevo certificado.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload,
        });

        // Validamos que la API haya creado el segundo certificado.
        expect(response.statusCode).toBe(201);

        // Parseamos la respuesta.
        const body = JSON.parse(response.payload);

        // Guardamos el nuevo certificado como el activo actual.
        activeCertificateId = body.data.id;

        // Buscamos en DB el primer certificado.
        const firstCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: firstCertificateId },
        });

        // Buscamos en DB el segundo certificado.
        const activeCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: activeCertificateId },
        });

        // El primer certificado debe quedar invalidado.
        expect(firstCertificate?.is_validated).toBe(false);

        // El nuevo certificado debe quedar activo.
        expect(activeCertificate?.is_validated).toBe(true);

        // El nuevo certificado debe mantener la matrícula enviada.
        expect(activeCertificate?.doctor_license).toBe('MP-67890');
    });

    // Cuarto test: verifica que la API rechace certificados con fechas inválidas.
    it('4. POST: Debe fallar si la fecha de vencimiento no es posterior a la emisión', async () => {
        // Armamos un payload inválido donde expiry_date es anterior a issue_date.
        const payload = {
            member_id: createdMemberId,
            issue_date: '2028-01-01',
            expiry_date: '2027-01-01',
            doctor_license: 'MP-00000',
        };

        // Ejecutamos la request inválida.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload,
        });

        // Validamos que la API responda Bad Request.
        expect(response.statusCode).toBe(400);

        // Parseamos el error devuelto por el controller.
        const body = JSON.parse(response.payload);

        // Validamos que el mensaje corresponda a la regla de fechas.
        expect(body.error).toContain('posterior');
    });

    // Quinto test: verifica que no se pueda crear un certificado para un socio inexistente.
    it('5. POST: Debe fallar si el socio indicado no existe', async () => {
        // Armamos un payload con un member_id que no existe en la base.
        const payload = {
            member_id: 'member-inexistente',
            issue_date: '2026-05-01',
            expiry_date: '2027-05-01',
            doctor_license: 'MP-11111',
        };

        // Ejecutamos la request contra la API real.
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medicalcertificate',
            payload,
        });

        // Validamos que la API responda Not Found.
        expect(response.statusCode).toBe(404);

        // Parseamos la respuesta de error.
        const body = JSON.parse(response.payload);

        // Validamos el mensaje de negocio.
        expect(body.error).toBe('El socio indicado no se encuentra registrado');
    });

    // Sexto test: verifica que se pueda eliminar físicamente un certificado existente.
    it('6. DELETE: Debe eliminar un certificado médico existente', async () => {
        // Ejecutamos el borrado del certificado activo creado en los tests anteriores.
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/medicalcertificate/${activeCertificateId}`,
        });

        // Validamos que la API responda No Content.
        expect(response.statusCode).toBe(204);

        // Consultamos la base para confirmar que el registro ya no existe.
        const dbCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: activeCertificateId },
        });

        // Confirmamos que fue eliminado físicamente.
        expect(dbCertificate).toBeNull();

        // Limpiamos la variable para evitar intentar usar este id de nuevo.
        activeCertificateId = '';
    });
});
