import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Sport API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdSportId: string;
    
    // Sufijo aleatorio para evitar colisiones con deportes reales en desarrollo
    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testSportName = `Deporte E2E ${randomSuffix}`;

    beforeAll(async () => {
        // 1. Levantamos la app entera (incluyendo PostgreSQL vía el backend real)
        app = buildApp();
        await app.ready();
        
        // 2. Instanciamos Prisma independientemente para verificar la base de datos
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();
    });

    afterAll(async () => {
        // Limpiamos la base de datos (Tear down) si el registro quedó huérfano
        if (createdSportId) {
            await prisma.sport.deleteMany({
                where: { id: createdSportId }
            });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar la lista de deportes existente', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/sport' 
        });
        console.log("ERROR INTERNO:", response.payload); 

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear un deporte en la base de datos real', async () => {
        const payload = {
            name: testSportName,
            max_capacity: 20,
            description: 'Deporte de prueba para tests',
            additional_price: 500,
            requires_medical_certificate: false,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sport',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        
        expect(body.data.id).toBeDefined();
        expect(body.data.name).toBe(testSportName);
        
        // Guardamos el ID para usarlo en los siguientes tests y limpiar la base al final
        createdSportId = body.data.id;
        
        // Verificación directa E2E: ¿Se insertó realmente en PostgreSQL?
        const dbSport = await prisma.sport.findUnique({ where: { id: createdSportId } });
        expect(dbSport).not.toBeNull();
        expect(dbSport?.name).toBe(testSportName);
    });

    it('3. POST: Debe fallar si se intenta crear un deporte con el mismo nombre', async () => {
        const payload = {
            name: testSportName, // Mismo nombre que acabamos de registrar
            max_capacity: 10,
            description: '',
            additional_price: 500,
            requires_medical_certificate: false,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/sport',
            payload
        });

        expect(response.statusCode).toBe(409); // Conflict
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('Ya existe un deporte con ese nombre');
    });

    
});