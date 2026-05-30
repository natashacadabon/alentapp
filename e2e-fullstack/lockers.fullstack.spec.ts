import { test, expect } from '@playwright/test';

test.describe('Lockers Full-Stack E2E', () => {
  const createdLocation = 'Vestuario FS Fullstack';
  const updatedLocation = 'Vestuario FS Fullstack Editado';
  const lockerNumber = 98765;

  test('debe mostrar el estado vacio cuando no hay lockers en la DB', async ({ page }) => {
    await page.goto('/lockers');
    await expect(page.getByText('No se encontraron lockers.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un locker real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/lockers');

    await page.getByRole('button', { name: /Agregar Locker/i }).click();
    const createDialog = page.getByRole('dialog', { name: 'Agregar Nuevo Locker' });
    await expect(createDialog).toBeVisible();

    await createDialog.getByPlaceholder('Ej. 12').fill(String(lockerNumber));
    await createDialog.getByRole('textbox', { name: 'Ubicación' }).fill(createdLocation);

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers') &&
        response.request().method() === 'POST' &&
        response.ok(),
      ),
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers') &&
        response.request().method() === 'GET' &&
        response.ok(),
      ),
      createDialog.getByRole('button', { name: 'Crear Locker' }).click(),
    ]);

    await expect(createDialog).toBeHidden();
    await expect(page.getByText(createdLocation)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(String(lockerNumber))).toBeVisible();
  });

  test('debe editar el locker creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/lockers');

    const createdRow = page.locator('tr', { hasText: createdLocation });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole('button', { name: /Editar locker/i }).click();

    const editDialog = page.getByRole('dialog', { name: 'Editar Locker' });
    await expect(editDialog).toBeVisible();
    await editDialog.getByRole('textbox', { name: 'Ubicación' }).fill(updatedLocation);

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers/') &&
        response.request().method() === 'PATCH' &&
        response.ok(),
      ),
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers') &&
        response.request().method() === 'GET' &&
        response.ok(),
      ),
      editDialog.getByRole('button', { name: 'Guardar Cambios' }).click(),
    ]);

    await expect(editDialog).toBeHidden();
    await expect(page.getByText(updatedLocation)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(createdLocation, { exact: true })).toBeHidden();
  });

  test('debe eliminar el locker y mostrar el estado vacio', async ({ page }) => {
    await page.goto('/lockers');

    const updatedRow = page.locator('tr', { hasText: updatedLocation });
    await expect(updatedRow).toBeVisible();
    await updatedRow.getByRole('button', { name: /Eliminar locker/i }).click();

    const deleteDialog = page.getByRole('dialog', { name: 'Eliminar Locker' });
    await expect(deleteDialog).toBeVisible();

    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers/') &&
        response.request().method() === 'DELETE' &&
        response.ok(),
      ),
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers') &&
        response.request().method() === 'GET' &&
        response.ok(),
      ),
      deleteDialog.getByRole('button', { name: 'Eliminar' }).click(),
    ]);

    await expect(deleteDialog).toBeHidden();
    await expect(page.getByText('No se encontraron lockers.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(updatedLocation)).toBeHidden();
  });
});
