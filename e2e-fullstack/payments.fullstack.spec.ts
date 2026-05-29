import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001/api/v1';

/**
 * Tests E2E Full-Stack para la vista de Pagos.
 * NO hay ningun mock de red. Playwright interactua con:
 *   - El Frontend React en http://localhost:5173
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Payments Full-Stack E2E', () => {

    test('debe mostrar el estado vacio cuando no hay pagos en la DB', async ({
        page,
    }) => {
        // Navega a la vista de Pagos
        await page.goto('/payments');
        // Verifica que se muestre el mensaje de estado vacío
        await expect(page.getByText('No se encontraron pagos.')).toBeVisible({
            timeout: 10000,
        });
    });
    test('debe crear un pago real y mostrarlo en la tabla', async ({
        page,
        request,
    }) => {
        // Crear un miembro real para poder asociarlo al pago
        const memberResponse = await request.post(`${API_URL}/socios`, {
            data: {
                name: 'Socio Pago E2E',
                dni: '77889900',
                email: 'pago.e2e@test.com',
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });

        expect(memberResponse.status()).toBe(201);

        await page.goto('/payments');

        // Abrir modal de creacion
        await page.locator('button:has-text("Agregar Pago")').click();
        await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

        // Seleccionar el socio creado previamente
        await page
            .getByPlaceholder('Buscar por nombre o DNI')
            .fill('Socio Pago E2E');
        await page.getByText('Socio Pago E2E').click();

        // Llenar formulario con datos reales
        await page.getByLabel('Mes').fill('5');
        await page.getByLabel('Año').fill('2026');
        await page.getByLabel('Monto').fill('15000');
        await page.getByLabel('Fecha de Vencimiento').fill('2026-06-01');

        // Guardar
        await page.getByRole('button', { name: 'Crear Pago' }).click();

        // Esperar que el modal se cierre y el pago aparezca en la tabla real
        await expect(
            page.getByRole('button', { name: 'Crear Pago' }),
        ).toBeHidden();
        await expect(page.getByText('Socio Pago E2E')).toBeVisible({
            timeout: 10000,
        });
        await expect(page.getByText('77889900')).toBeVisible();
        await expect(
            page.getByRole('cell', { name: '5/2026', exact: true }),
        ).toBeVisible();
        await expect(page.getByText('Pendiente')).toBeVisible();
    });



});
