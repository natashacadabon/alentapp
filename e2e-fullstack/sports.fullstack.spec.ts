import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Deportes.
 * NO hay ningún mock de red. Playwright interactúa con:
 * - El Frontend React en http://localhost:5173
 * - La API Fastify real en http://localhost:3001
 * - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Sports Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay deportes en la DB', async ({ page }) => {
    await page.goto('/sports');
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un deporte real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/sports');

    // Abrir modal de creación
    await page.locator('button:has-text("Agregar Deporte")').click();
    await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

    // Llenar formulario con datos reales
    await page.getByLabel(/Nombre/i).fill('Fútbol E2E');
    await page.getByLabel(/Descripción/i).fill('Descripción de prueba');
    await page.getByLabel(/Capacidad Máxima/i).fill('20');
    await page.getByLabel(/Precio Adicional/i).fill('300');

    // Guardar
    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    // Esperar que el modal se cierre y el deporte aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Deporte' })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'Fútbol E2E', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Descripción de prueba')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
    await page.goto('/sports');

    // Aseguramos que el deporte existe en la tabla antes de editar
    await expect(page.getByRole('cell', { name: 'Fútbol E2E', exact: true })).toBeVisible();

    // Abrimos el modal de edición
    await page.getByRole('button', { name: /Editar deporte/i }).first().click();
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    // Modificamos la capacidad máxima
    const inputCapacidad = page.getByLabel(/Capacidad Máxima/i);
    await inputCapacidad.waitFor({ state: 'visible' });
    await inputCapacidad.fill('35');

    // Guardamos los cambios
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Validamos que el modal desapareció de la pantalla
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificamos que la UI refleja el cambio
    await expect(page.getByText('35')).toBeVisible();
  });

});