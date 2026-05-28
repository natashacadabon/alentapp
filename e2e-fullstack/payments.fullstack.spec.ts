import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:3001/api/v1';

test.describe('Payments Full-Stack E2E', () => {
    // Test 1: Verifica el flujo completo de alta de pago desde la UI.
    test('debe crear un pago desde la pantalla de pagos', async ({
        page,
        request,
    }) => {
        // crea un socio por API para usarlo como precondición del pago.
        const memberResponse = await request.post(`${API_URL}/socios`, {
            data: {
                name: 'Socio Pago E2E',
                dni: '77889900',
                email: 'pago.e2e@test.com',
                birthdate: '1990-01-01',
                category: 'Pleno',
            },
        });

        // Valida que la precondición se cumpla.
        expect(memberResponse.status()).toBe(201);

        // Navega a la pantalla de pagos.
        await page.goto('/payments');

        // Abre el formulario de alta.
        await page.getByRole('button', { name: /Agregar Pago/i }).click();
        await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

        // Busca y selecciona el socio creado.
        await page
            .getByPlaceholder('Buscar por nombre o DNI')
            .fill('Socio Pago E2E');
        await page.getByText('Socio Pago E2E').click();

        // Completa los campos del formulario.
        await page.getByLabel('Mes').fill('5');
        await page.getByLabel('Año').fill('2026');
        await page.getByLabel('Monto').fill('15000');
        await page.getByLabel('Fecha de Vencimiento').fill('2026-06-01');

        // Envía la creación del pago.
        await page.getByRole('button', { name: 'Crear Pago' }).click();

        // confirma cierre del modal y render del pago en la tabla.
        await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden();
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
