
import { test, expect } from '@playwright/test';

test.use({ launchOptions: { slowMo: 800 } });

// Agrupamos los tests E2E de UI.
test.describe('MedicalCertificate E2E (UI Integration)', () => {
  // Definimos una "base de datos" simulada para controlar qué datos devuelve la red.
    let mockDb: Array<{
        id: string;
        member_id: string;
        issue_date: string;
        expiry_date: string;
        doctor_license: string;
        is_validated: boolean;
    }>;

    // beforeEach se ejecuta antes de cada test para que todos arranquen desde el mismo estado.
    test.beforeEach(async ({ page }) => {
    // Mostramos en la consola de Node lo que escriba el navegador.
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Reiniciamos los datos mockeados antes de cada test para que el resultado sea predecible.
        mockDb = [
        {
            id: 'certificate-1',
            member_id: 'member-1',
            issue_date: '2026-05-01',
            expiry_date: '2027-05-01',
            doctor_license: 'MP-12345',
            is_validated: true,
        },
        ];

    // Interceptamos las llamadas globales a certificados para manejar preflight CORS si aparece.
    await page.route(/\/api\/v1\/medicalcertificate/, async (route) => {
      // Si el navegador manda OPTIONS, responde como si la API permitiera la llamada.
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      
      await route.continue();
    });

    // Intercepta solo el GET exacto a /api/v1/medicalcertificate para devolver datos simulados.
    await page.route(/\/api\/v1\/medicalcertificate$/, async (route) => {
      // La pantalla usa GET para cargar la tabla inicial de certificados.
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',

          // La vista actual accede a certificates.length y luego a certificates.data.map.
          // Por eso devolvemos un objeto con length y data para que renderice sin tocar código de app.
          body: JSON.stringify({
            length: mockDb.length,
            data: mockDb,
          }),
        });
      } else {
        // Si en otro test se usa otro método, no lo bloqueamos desde este interceptor.
        await route.continue();
      }
    });

    // Navegamos a la vista real de certificados después de configurar todos los interceptores.
    await page.goto('/medicalcertificate');
  });

  // Primer test: verifica que la pantalla muestre los certificados médicos recibidos desde la red mockeada.
  test('debe mostrar la lista de certificados médicos cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que la matrícula médica del certificado aparezca en la tabla.
    await expect(page.getByText('MP-12345')).toBeVisible();

    // Verificamos que el member_id asociado al certificado se muestre en la columna de socio.
    await expect(page.getByText('member-1')).toBeVisible();

    // Verificamos que el estado validado se muestre como "Sí" en la tabla.
    await expect(page.getByText('Sí')).toBeVisible();
  });
});
