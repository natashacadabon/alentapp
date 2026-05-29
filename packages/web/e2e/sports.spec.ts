import { test, expect } from '@playwright/test';

test.use({ launchOptions: { slowMo: 800 } });

test.describe('Sports E2E (UI Integration)', () => {
  // estado simulado de la DB se define a nivel de describe para mantener el contexto
  let mockDb: Array<{
    id: string;
    name: string;
    description: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
  }>;

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Reiniciamos los datos antes de CADA test para asegurar idempotencia
    // para que cada test arranque con el mismo estado inicial sin depender del anterior
    mockDb = [
      {
        id: '1',
        name: 'Fútbol',
        description: 'Desc vieja',
        max_capacity: 22,
        additional_price: 500,
        requires_medical_certificate: true,
      }
    ];

    // Interceptamos todas las llamadas de red para aislar le front

    // Manejo de peticiones globales (CORS OPTIONS)
    await page.route(/\/api\/v1\/sport/, async (route) => {
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      }
      await route.continue();
    });

    // Interceptor para el GET 
    // usamos $ al final para que solo matchee /api/v1/sport sin ID
    await page.route(/\/api\/v1\/sport$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb })
        });
      } else {
        await route.continue();
      }
    });


    // Va a la vista de deportes después de configurar todos las rutas
    await page.goto('/sports');
  });

  test('debe mostrar la lista de deportes cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
    await expect(page.getByText('Fútbol')).toBeVisible();
    await expect(page.getByText('22')).toBeVisible();
  });

});