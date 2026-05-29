import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MemberDTO, PaymentDTO } from '@alentapp/shared';
import { Provider } from '../components/ui/provider';
import { membersService } from '../services/members';
import { paymentsService } from '../services/payments';
import { PaymentsView } from './Payments';

// Mockeamos servicios para aislar la UI de llamadas reales a API.
vi.mock('../services/payments', () => ({
    paymentsService: {
        create: vi.fn(),
        getAll: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../services/members', () => ({
    membersService: {
        getAll: vi.fn(),
    },
}));

describe('PaymentsView', () => {
    // Datos base reutilizados por los tests.
    const member: MemberDTO = {
        id: 'member-1',
        name: 'Juan Perez',
        dni: '12345678',
        email: 'juan@test.com',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-05-01T00:00:00.000Z',
    };

    const payment: PaymentDTO = {
        id: 'payment-1',
        member_id: member.id,
        member: {
            name: member.name,
            dni: member.dni,
        },
        amount: 15000,
        month: 5,
        year: 2026,
        due_date: '2026-06-01T00:00:00.000Z',
        payment_date: null,
        status: 'Pendiente',
    };

    const renderWithProviders = (ui: React.ReactElement) => {
        // Wrapper para inyectar el Provider global de la app.
        return render(<Provider>{ui}</Provider>);
    };

    beforeEach(() => {
        // Reiniciamos y configuramos respuestas por defecto para cada prueba.
        vi.clearAllMocks();
        // Por defecto, el servicio de pagos responde con una lista vacía para validar estados iniciales.
        vi.mocked(paymentsService.getAll).mockResolvedValue([]);
        vi.mocked(paymentsService.create).mockResolvedValue(payment);
        vi.mocked(paymentsService.update).mockResolvedValue({
            ...payment,
            status: 'Pagado',
            payment_date: '2026-06-10T00:00:00.000Z',
        });
        vi.mocked(paymentsService.delete).mockResolvedValue(undefined);
        vi.mocked(membersService.getAll).mockResolvedValue([member]);
    });

    it('debe mostrar el estado de carga y luego una tabla vacia', async () => {
        // Renderizamos la vista y validamos el mensaje de carga inicial.
        renderWithProviders(<PaymentsView />);
        // Validamos que el mensaje de carga se muestre inicialmente.
        expect(screen.getByText('Cargando pagos...')).toBeInTheDocument();
        // Esperamos a que el mensaje de carga desaparezca y se muestre el estado de tabla vacía.
        await waitFor(() => {
            expect(
                screen.queryByText('Cargando pagos...'),
            ).not.toBeInTheDocument();
        });
        // Validamos que se muestre el mensaje de tabla vacía cuando no hay pagos.
        expect(
            screen.getByText('No se encontraron pagos.'),
        ).toBeInTheDocument();
        expect(paymentsService.getAll).toHaveBeenCalledOnce();
    });

    it('debe renderizar pagos cuando el servicio responde exitosamente', async () => {
        // Forzamos una lista con un pago para validar render de filas.
        vi.mocked(paymentsService.getAll).mockResolvedValue([payment]);
        // Renderizamos la vista y esperamos a que los datos se muestren.
        renderWithProviders(<PaymentsView />);
        // Validamos que la información del pago se muestre correctamente en la tabla.
        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        });
        // Validamos campos clave del pago.
        expect(screen.getByText('12345678')).toBeInTheDocument();
        expect(screen.getByText('5/2026')).toBeInTheDocument();
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    it('debe mostrar un mensaje de error si falla la carga de pagos', async () => {
        // Simulamos error de backend y verificamos feedback al usuario.
        vi.mocked(paymentsService.getAll).mockRejectedValueOnce(
            new Error('No se pudieron cargar los pagos'),
        );
        // Renderizamos la vista y esperamos a que se muestre el mensaje de error.

        renderWithProviders(<PaymentsView />);
        // Validamos que el mensaje de error se muestre al fallar la carga.
        await waitFor(() => {
            expect(
                screen.getByText('No se pudieron cargar los pagos'),
            ).toBeInTheDocument();
        });
    });

    it('debe volver a consultar pagos al hacer click en Actualizar', async () => {
        const user = userEvent.setup();
        // Renderizamos la vista y esperamos a que se muestre la información inicial.

        renderWithProviders(<PaymentsView />);
        // Esperamos a que el mensaje de carga desaparezca para validar la interacción.
        await waitFor(() => {
            expect(
                screen.queryByText('Cargando pagos...'),
            ).not.toBeInTheDocument();
        });
        // Simulamos click en el botón de actualizar y validamos que se vuelva a consultar la lista de pagos.
        await user.click(screen.getByRole('button', { name: /Actualizar/i }));
        // Validamos que el servicio de pagos se haya llamado nuevamente para refrescar la lista.
        expect(paymentsService.getAll).toHaveBeenCalledTimes(2);
    });
    // Test unitario de vista con flujo completo de creación desde la UI.
    it('debe permitir crear un pago desde el formulario', async () => {
        const user = userEvent.setup();
        // Renderizamos la vista y esperamos a que se muestre la información inicial.
        renderWithProviders(<PaymentsView />);
        // Esperamos a que el mensaje de carga desaparezca para validar la interacción.
        await waitFor(() => {
            expect(
                screen.queryByText('Cargando pagos...'),
            ).not.toBeInTheDocument();
        });
        // Simulamos el flujo de creación de un pago desde la UI, incluyendo selección de socio y llenado de formulario.
        await user.click(screen.getByRole('button', { name: /Agregar Pago/i }));
        await user.type(
            screen.getByPlaceholderText('Buscar por nombre o DNI'),
            'Juan',
        );
        // Esperamos a que se muestren los resultados de búsqueda y seleccionamos el socio.
        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        });
        // Simulamos la selección del socio en el dropdown.
        fireEvent.mouseDown(screen.getByText('Juan Perez'));
        // Llenamos el formulario con datos válidos para crear el pago.
        const monthInput = screen.getByDisplayValue('4');
        const yearInput = screen.getByDisplayValue('2026');
        const amountInput = screen.getByDisplayValue('0');
        const dueDateInput = screen.getByDisplayValue('2026-05-01');
        // Limpiamos y llenamos cada campo del formulario con los datos del nuevo pago.
        await user.clear(monthInput);
        await user.type(monthInput, '5');
        await user.clear(yearInput);
        await user.type(yearInput, '2026');
        await user.clear(amountInput);
        await user.type(amountInput, '15000');
        fireEvent.change(dueDateInput, { target: { value: '2026-06-01' } });
        // Simulamos el envío del formulario para crear el pago.
        await user.click(screen.getByRole('button', { name: 'Crear Pago' }));

        // Confirmamos el payload exacto enviado al servicio.
        await waitFor(() => {
            expect(paymentsService.create).toHaveBeenCalledWith({
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-06-01',
            });
        });
    });

    it('debe permitir cancelar un pago existente', async () => {
        const user = userEvent.setup();
        // Partimos de un pago pendiente para habilitar la acción de cancelación.
        vi.mocked(paymentsService.getAll).mockResolvedValue([payment]);
        // Renderizamos la vista y esperamos a que se muestre la información del pago.
        renderWithProviders(<PaymentsView />);
        // Esperamos a que el mensaje de carga desaparezca y se muestre el pago para validar la interacción.
        await waitFor(() => {
            expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        });
        // Simulamos el flujo de cancelación de un pago desde la UI, incluyendo apertura de modal y confirmación.
        await user.click(screen.getByLabelText('Cancelar pago'));
        // Validamos que se abra el modal de confirmación al hacer click en cancelar.
        expect(
            screen.getByRole('heading', { name: 'Cancelar pago' }),
        ).toBeInTheDocument();
        // Simulamos la confirmación de cancelación en el modal.
        await user.click(
            screen.getByRole('button', { name: /cancelar pago/i }),
        );
        // Confirmamos que se haya llamado al servicio de eliminación con el ID correcto del pago.
        await waitFor(() => {
            expect(paymentsService.delete).toHaveBeenCalledWith('payment-1');
        });
    });
});
