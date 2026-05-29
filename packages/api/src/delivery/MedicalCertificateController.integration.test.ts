import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';

describe('MedicalCertificate - Tests de integración', () => {
    let app: ReturnType<typeof buildApp>;

    const member_id = 'member-1';

    beforeAll(async () => {
        // Se construye la aplicación Fastify antes de ejecutar los tests.
        app = buildApp();

        
        await app.ready();
    });

    afterAll(async () => {
        
        await app.close();
    });

        //primero test: verifica que se pueda crear un certificado médico correctamente.
        it('debería crear un certificado médico correctamente', async () => {
        // Enviamos una petición POST a la ruta de creación de certificados médicos.
        const response = await app.inject({
        method: 'POST',
        url: '/api/v1/medicalcertificate',
        payload: {
            issue_date: '2026-05-01',
            expiry_date: '2026-12-01',
            doctor_license: 'MP123456',
            is_validated: true,
            member_id: member_id,
        },
        });

        // Verificamos que el servidor responda con código 201,
        expect(response.statusCode).toBe(201);


        const body = JSON.parse(response.body);

        // Verificamos que el certificado creado tenga un id.
        expect(body).toHaveProperty('id');

        // Verificamos que los datos devueltos coincidan con los enviados.
        expect(body.doctor_license).toBe('MP123456');
        expect(body.is_validated).toBe(true);
        expect(body.member_id).toBe(member_id);
    });

    // segundo test: verifica que se puedan listar los certificados médicos.
    it('debería listar los certificados médicos', async () => {
        // Enviamos una petición GET a la ruta que lista certificados médicos.
        const response = await app.inject({
        method: 'GET',
        url: '/api/v1/medicalcertificate',
        });

        // Verificamos que el servidor responda correctamente.
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);

        // Verificamos que la respuesta sea un array porque devuelve una coleccion.
        expect(Array.isArray(body)).toBe(true);
    });

    // tercer test: verifica que se pueda actualizar un certificado médico existente.
    it('debería actualizar un certificado médico existente', async () => {
        // Creamos un certificado médico.
        const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/medicalcertificate',
        payload: {
            issue_date: '2026-05-01',
            expiry_date: '2026-12-01',
            doctor_license: 'MP111111',
            is_validated: false,
            member_id: member_id,
        },
        });

        // Verificamos que la creación haya sido exitosa.
        expect(createResponse.statusCode).toBe(201);

        // Obtenemos el certificado creado desde la respuesta.
        const createdCertificate = JSON.parse(createResponse.body);

        // Enviamos una petición PUT para actualizar el certificado recién creado.
        const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/v1/medicalcertificate/${createdCertificate.id}`,
        payload: {
            issue_date: '2026-05-10',
            expiry_date: '2026-12-10',
            doctor_license: 'MP999999',
            is_validated: true,
            member_id: member_id,
        },
        });

        // Verificamos que la actualización responda con código 200.
        expect(updateResponse.statusCode).toBe(200);

        // Convertimos la respuesta actualizada en objeto.
        const updatedCertificate = JSON.parse(updateResponse.body);

        // Verificamos que el id sea el mismo para que se haya actualizado el mismo
        expect(updatedCertificate.id).toBe(createdCertificate.id);

        // Verificamos que los campos hayan sido modificados correctamente.
        expect(updatedCertificate.doctor_license).toBe('MP999999');
        expect(updatedCertificate.is_validated).toBe(true);
        expect(updatedCertificate.member_id).toBe(member_id);
    });

    //cuarto test: verifica que se pueda eliminar un certificado médico existente.
    it('debería eliminar un certificado médico existente', async () => {
        // Primero creamos un certificado médico
        const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/medicalcertificate',
        payload: {
            issue_date: '2026-05-01',
            expiry_date: '2026-12-01',
            doctor_license: 'MP654321',
            is_validated: true,
            member_id: member_id,
        },
        });

        // Verificamos que el certificado se haya creado correctamente.
        expect(createResponse.statusCode).toBe(201);

        // Obtenemos el certificado creado.
        const createdCertificate = JSON.parse(createResponse.body);

        // Enviamos una petición DELETE usando el id del certificado creado.
        const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/v1/medicalcertificate/${createdCertificate.id}`,
        });

        // Verificamos que la eliminación responda con 204
        expect(deleteResponse.statusCode).toBe(204);
    });

    // quinto test: verifica que no se pueda crear un certificado médico con fechas inválidas.
    it('debería devolver error si la fecha de vencimiento no es posterior a la fecha de emisión', async () => {
        // Enviamos una petición POST con fechas inválidas: la fecha de vencimiento es anterior a la fecha de emisión.
        const response = await app.inject({
        method: 'POST',
        url: '/api/v1/medicalcertificate',
        payload: {
            issue_date: '2026-12-01',
            expiry_date: '2026-05-01',
            doctor_license: 'MP123456',
            is_validated: true,
            member_id: member_id,
        },
        });

        // Verificamos que el servidor responda con código 400 indicando error
        expect(response.statusCode).toBe(400);

        // Convertimos la respuesta de error en objeto.
        const body = JSON.parse(response.body);

        // Verificamos que el mensaje de error sea el esperado.
        expect(body.message).toContain(
        'La fecha de vencimiento debe ser posterior a la de emisión'
        );
    });

    // sexto test: verifica que no se pueda eliminar un certificado médico inexistente.
    it('debería devolver error si se intenta eliminar un certificado médico inexistente', async () => {
        // Intentamos eliminar un certificado usando un id que no existe.
        const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/medicalcertificate/id-inexistente',
        });

        // Verificamos que el servidor responda con 404: no fue encontrado
        expect(response.statusCode).toBe(404);

        // Convertimos la respuesta de error en objeto.
        const body = JSON.parse(response.body);

        // Verificamos que el mensaje indique que el certificado no existe.
        expect(body.message).toContain('El certificado indicado no se encuentra');
    });





});