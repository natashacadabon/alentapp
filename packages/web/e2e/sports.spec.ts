import { test, expect } from '@playwright/test';

test.use({ launchOptions: { slowMo: 800 } });

test.describe('Sports E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Estado en memoria simulando la Base de Datos para estos tests
    const mockDb = [
      {
        id: '1',
        name: 'Fútbol',
        description: 'Desc vieja',
        max_capacity: 22,
        additional_price: 500,
        requires_medical_certificate: true,
      }
    ];

    // Interceptamos todas las llamadas de red hacia nuestro backend de deportes
    // De este modo, nuestros tests E2E del frontend son resilientes y no dependen 
    // de que la base de datos de PostgreSQL esté levantada.
    await page.route(/\/api\/v1\/sport/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb })
        });
      } 
      else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newSport = {
          id: String(mockDb.length + 1),
          description: '', 
          requires_medical_certificate: false,
          ...payload
        };
       
        mockDb.push(newSport);

        // Simulamos la creación exitosa devolviendo lo creado
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newSport })
        });
      } 
      else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', // Tu backend usa PATCH
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      } 
      else if (method === 'PATCH') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex(s => String(s.id) === String(id));
        
        console.log('PATCH payload', payload, 'found index', index);
        
        if (index > -1) {
          mockDb[index] = { ...mockDb[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] })
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
        }
      } 
      else {
        await route.continue();
      }
    });

    // Navegamos directamente a la vista de deportes
    await page.goto('/sports');
  });

  test('debe mostrar la lista de deportes cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
    await expect(page.getByText('Fútbol')).toBeVisible();
    await expect(page.getByText('22')).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    // Buscar y clickear en "Agregar Deporte"
    await page.locator('button:has-text("Agregar Deporte")').click();

    // Verificamos que el modal se abrió
    await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

    // Llenar el formulario simulando tipeo real de usuario usando tus placeholders
    await page.getByPlaceholder('Ej. Fútbol').fill('Voley E2E');
    await page.getByPlaceholder('Ej. 20').fill('12');
    await page.getByPlaceholder('Ej. 500').fill('200');

    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    await expect(page.getByRole('button', { name: 'Crear Deporte' })).toBeHidden();

    // Verificamos que el componente hizo refresh y muestra el nuevo deporte en la tabla
    await expect(page.getByText('Voley E2E')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
    // Buscar y clickear en el botón de edición del deporte existente
    await page.getByRole('button', { name: /Editar deporte/i }).click();

    // Verificamos que el modal se abrió con el título correcto
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    await page.getByLabel(/Capacidad Máxima/i).fill('30');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar que se cierre
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar en la tabla que se actualizó el valor reflejado por el PATCH
    await expect(page.getByText('30')).toBeVisible();
  });
  
});