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

});
