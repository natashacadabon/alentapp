// Importamos las utilidades de Playwright para definir tests y validar la UI.
import { test, expect } from '@playwright/test';


// Usamos describe.serial porque los tests comparten el socio creado en beforeAll.
test.describe.serial('MedicalCertificate Full-Stack E2E', () => {
  // Guardamos el socio real creado en la API para poder buscarlo desde la UI.
  let member: {
    id: string;
    name: string;
    dni: string;
    email: string;
  };


  const randomSuffix = Date.now().toString();

  // Definimos datos del socio que sera usado por la pantalla de certificados.
  const memberPayload = {
    name: 'Socio Certificado Fullstack',
    dni: `MC${randomSuffix.slice(-8)}`,
    email: `medical-fullstack-${randomSuffix}@e2e.com`,
    birthdate: '1995-06-15',
    category: 'Pleno',
  };

  // Antes de los tests creamos un socio real usando la API real.
  test.beforeAll(async ({ request }) => {
    // Pegamos al endpoint real de socios expuesto por el contenedor api-test.
    const response = await request.post('http://localhost:3001/api/v1/socios', {
      data: memberPayload,
    });

    // Confirmamos que el socio se haya creado correctamente.
    expect(response.status()).toBe(201);

    // Leemos el body para guardar el id real que genero la base.
    const body = await response.json();

    // Guardamos los datos necesarios para buscarlos desde la UI.
    member = {
      id: body.data.id,
      name: body.data.name,
      dni: body.data.dni,
      email: body.data.email,
    };
  });

  // Antes de cada test redirigimos las llamadas de certificados al puerto real de la API E2E.
  test.beforeEach(async ({ page }) => {
    // El servicio web de certificados apunta a localhost:3000, pero Docker E2E expone la API en 3001.
    await page.route('http://localhost:3000/api/v1/medicalcertificate**', async (route) => {
      // No mockeamos la respuesta: solo cambiamos el puerto y seguimos hacia la API real.
      await route.continue({
        url: route.request().url().replace('localhost:3000', 'localhost:3001'),
      });
    });
  });

  // Primer test: verifica que la vista de certificados cargue contra el backend real.
  test('debe abrir la vista de certificados medicos', async ({ page }) => {
    // Navegamos a la ruta real del frontend.
    await page.goto('/medicalcertificate');

    // Validamos que el titulo principal de la pantalla este visible.
    await expect(
      page.getByRole('heading', {
        name: /Administracion de Certificados Medicos|Administración de Certificados Médicos/i,
      }),
    ).toBeVisible({ timeout: 10000 });

    // Validamos que la accion principal de alta este disponible.
    await expect(
      page.getByRole('button', { name: /Agregar Certificado/i }),
    ).toBeVisible();
  });

  // Segundo test: crea un certificado medico real desde la UI y lo verifica en la tabla.
  test('debe crear un certificado medico real y mostrarlo en la tabla', async ({ page }) => {
    // Abrimos la vista real de certificados.
    await page.goto('/medicalcertificate');

    // Abrimos el modal de creacion.
    await page.getByRole('button', { name: /Agregar Certificado/i }).click();

    // Confirmamos que el modal de creacion se haya abierto.
    await expect(
      page.getByText(/Agregar Nuevo Certificado Medico|Agregar Nuevo Certificado Médico/i),
    ).toBeVisible();

    // Completamos la fecha de emision.
    await page.getByLabel(/Fecha de emision|Fecha de emisión/i).fill('2026-05-01');

    // Completamos la fecha de vencimiento.
    await page.getByLabel(/Fecha de vencimiento/i).fill('2027-05-01');

    // Completamos la matricula medica.
    await page.getByPlaceholder('Ej. MP 12345').fill('MP-FULLSTACK-1');

    // Buscamos el socio real creado en beforeAll.
    await page.getByPlaceholder('Buscar por nombre o DNI').fill(member.name);

    // Seleccionamos el socio desde el dropdown real que devuelve la API.
    await page.getByText(member.name).click();

    // Enviamos el formulario para crear el certificado en la API real.
    await page.getByRole('button', { name: /Crear Certificado/i }).click();

    // Esperamos que el modal se cierre luego del alta.
    await expect(
      page.getByRole('button', { name: /Crear Certificado/i }),
    ).toBeHidden({ timeout: 10000 });

    // Validamos que la matricula creada aparezca en la tabla.
    await expect(page.getByText('MP-FULLSTACK-1')).toBeVisible({
      timeout: 10000,
    });

    // La tabla muestra el member_id, asi que verificamos el id real del socio.
    await expect(page.getByText(member.id)).toBeVisible();
  });

  // Tercer test: elimina el certificado medico creado desde la UI.
  test('debe eliminar el certificado medico creado', async ({ page }) => {
    // Entramos nuevamente a la vista; el certificado persiste porque esta en DB real.
    await page.goto('/medicalcertificate');

    // Confirmamos que el certificado exista antes de intentar borrarlo.
    await expect(page.getByText('MP-FULLSTACK-1')).toBeVisible({
      timeout: 10000,
    });

    // Abrimos el dialog de confirmacion desde el boton de eliminar.
    await page
      .getByRole('button', { name: /Eliminar certificado medico|Eliminar certificado médico/i })
      .first()
      .click();

    // Confirmamos que el dialog destructivo se haya abierto.
    await expect(
      page.getByText(/Seguro que queres eliminar|Seguro que querés eliminar/i),
    ).toBeVisible();

    // Confirmamos la eliminacion.
    await page.getByRole('button', { name: /^Eliminar$/i }).click();

    // Verificamos que el certificado ya no aparezca en la tabla.
    await expect(page.getByText('MP-FULLSTACK-1')).toBeHidden({
      timeout: 10000,
    });
  });
});
