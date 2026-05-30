import { test, expect } from '@playwright/test';

test.describe('Lockers E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Estado en memoria simulando la Base de Datos para estos tests
    const mockDb: any[] = [
      {
        id: 'locker-1',
        number: 1,
        location: 'Vestuario A',
        status: 'Disponible',
        member_id: null,
      },
    ];

    // Interceptamos todas las llamadas de red hacia el backend
    // De este modo los tests E2E son resilientes y no dependen de PostgreSQL ni Docker
    await page.route(/\/api\/v1\/lockers/, async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());
      const id = url.pathname.split('/').pop();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb }),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newLocker = {
          id: `locker-${mockDb.length + 1}`,
          status: payload.status ?? 'Disponible',
          member_id: payload.member_id ?? null,
          ...payload,
        };
        mockDb.push(newLocker);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newLocker }),
        });
      } else if (method === 'PATCH') {
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex(l => l.id === id);
        if (index > -1) {
          mockDb[index] = { ...mockDb[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] }),
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'El Locker no existe' }) });
        }
      } else if (method === 'DELETE') {
        const index = mockDb.findIndex(l => l.id === id);
        if (index > -1) mockDb.splice(index, 1);
        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    await page.goto('/lockers');
  });

  test('debe mostrar la lista de lockers cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que el locker del mock aparece en la tabla
    await expect(page.getByText('Vestuario A')).toBeVisible();
    await expect(page.getByText('Disponible')).toBeVisible();
  });

  test('debe abrir el modal de creación, crear un locker y mostrarlo en la tabla', async ({ page }) => {
    // Abrimos el modal de creación
    await page.locator('button:has-text("Agregar Locker")').click();
    await expect(page.getByText('Agregar Nuevo Locker')).toBeVisible();

    // Llenamos el formulario
    await page.getByPlaceholder('Ej. 12').fill('5');
    await page.getByPlaceholder('Ej. Vestuario A').first().fill('Vestuario E2E');

    // Enviamos
    await page.getByRole('button', { name: 'Crear Locker' }).click();

    // El nuevo locker aparece en la tabla tras el refresh
    await expect(page.getByText('Vestuario E2E')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar la ubicación y mostrar el cambio', async ({ page }) => {
    // Verificamos que el locker inicial está en la tabla
    await expect(page.getByText('Vestuario A')).toBeVisible();

    // Abrimos el modal de edición
    await page.getByRole('button', { name: 'Editar locker' }).click();
    const editDialog = page.getByRole('dialog', { name: 'Editar Locker' });
    await expect(editDialog).toBeVisible();

    // Modificamos la ubicación
    const locationInput = editDialog.getByRole('textbox', { name: 'Ubicación' });
    await locationInput.fill('Vestuario A - Fila 1');

    // Guardamos
    await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers/locker-1') &&
        response.request().method() === 'PATCH' &&
        response.ok()
      ),
      page.waitForResponse((response) =>
        response.url().includes('/api/v1/lockers') &&
        response.request().method() === 'GET' &&
        response.ok()
      ),
      editDialog.getByRole('button', { name: 'Guardar Cambios' }).click(),
    ]);

    await expect(editDialog).toBeHidden();

    // Verificamos el cambio en la tabla
    await expect(page.getByText('Vestuario A - Fila 1')).toBeVisible();
  });

  test('debe eliminar un locker tras confirmar el dialog y quitarlo de la tabla', async ({ page }) => {
    // Verificamos que el locker existe antes de eliminar
    await expect(page.getByText('Vestuario A')).toBeVisible();

    // Abrimos el dialog de confirmación
    await page.getByRole('button', { name: 'Eliminar locker' }).click();
    await expect(page.getByText(/¿Estás seguro de que deseas eliminar el locker/i)).toBeVisible();

    // Confirmamos la eliminación
    await page.getByRole('button', { name: 'Eliminar' }).click();

    // Verificamos que el locker ya no aparece y se muestra el estado vacío
    await expect(page.getByText('No se encontraron lockers.')).toBeVisible();
    await expect(page.getByText('Vestuario A')).toBeHidden();
  });
});
