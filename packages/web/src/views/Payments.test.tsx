import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { PaymentsView } from './Payments';
import { Provider } from '../components/ui/provider';

const mockFetchPayments = vi.fn();
const mockOpenCreateModal = vi.fn();
const mockOpenUpdateModal = vi.fn();
const mockSetIsDialogOpen = vi.fn();
const mockUpdateField = vi.fn();
const mockResetMemberSearch = vi.fn();
const mockSetMemberSearchValue = vi.fn();
const mockOpenCancelPaymentDialog = vi.fn();
const mockCloseCancelPaymentDialog = vi.fn();
const mockCancelPayment = vi.fn();

// Se mockean hooks para controlar estado y acciones desde cada escenario.
vi.mock('../hooks/usePayments', () => ({
    usePayments: vi.fn(),
}));

vi.mock('../hooks/usePaymentForm', () => ({
    usePaymentForm: vi.fn(),
}));

vi.mock('../hooks/useMemberSearch', () => ({
    useMemberSearch: vi.fn(),
}));

// Se mockean componentes hijos para enfocar las pruebas en la vista principal.
vi.mock('../components/PaymentFormDialog', () => ({
    PaymentFormDialog: () =>
        React.createElement('div', null, 'PaymentFormDialog mock'),
}));

vi.mock('../components/ConfirmActionDialog', () => ({
    ConfirmActionDialog: ({ title, children, onConfirm }: any) =>
        children
            ? React.createElement(
                  'div',
                  { role: 'dialog' },
                  React.createElement('h2', null, title),
                  children,
                  React.createElement(
                      'button',
                      { onClick: onConfirm },
                      'Confirmar mock',
                  ),
              )
            : null,
}));

import { usePayments } from '../hooks/usePayments';
import { usePaymentForm } from '../hooks/usePaymentForm';
import { useMemberSearch } from '../hooks/useMemberSearch';

describe('PaymentsView', () => {
    // Helper de render con Provider para replicar el contexto real de UI.
    const renderWithProviders = (ui: React.ReactElement) => {
        return render(<Provider>{ui}</Provider>);
    };

    // Estado base del hook de pagos; cada test ajusta solo lo que necesita.
    const mockUsePaymentsBase = {
        payments: [],
        isLoading: false,
        error: null,
        paymentToCancel: null,
        isCancellingPayment: false,
        cancelError: null,
        fetchPayments: mockFetchPayments,
        openCancelPaymentDialog: mockOpenCancelPaymentDialog,
        closeCancelPaymentDialog: mockCloseCancelPaymentDialog,
        cancelPayment: mockCancelPayment,
    };

    // Estado base del hook de formulario de pagos.
    const mockUsePaymentFormBase = {
        formMode: 'create',
        formData: {
            member_id: '',
            amount: 0,
            month: 1,
            year: 2026,
            due_date: '2026-05-10',
        },
        isDialogOpen: false,
        isSubmitting: false,
        setIsDialogOpen: mockSetIsDialogOpen,
        openCreateModal: mockOpenCreateModal,
        openUpdateModal: mockOpenUpdateModal,
        updateField: mockUpdateField,
        updateMonth: vi.fn(),
        updateYear: vi.fn(),
        submitPayment: vi.fn(),
    };

    // Estado base del hook de búsqueda de socios.
    const mockUseMemberSearchBase = {
        memberSearch: '',
        memberResults: [],
        memberSearchRef: { current: null },
        searchMembers: vi.fn(),
        handleSelectMember: vi.fn(),
        resetMemberSearch: mockResetMemberSearch,
        setMemberSearchValue: mockSetMemberSearchValue,
    };

    // Setup común: limpia mocks y restablece retornos base de los hooks.
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(usePayments).mockReturnValue(mockUsePaymentsBase as any);
        vi.mocked(usePaymentForm).mockReturnValue(mockUsePaymentFormBase as any);
        vi.mocked(useMemberSearch).mockReturnValue(mockUseMemberSearchBase as any);
    });

    // Limpia el DOM entre tests para evitar contaminación entre casos.
    afterEach(() => {
        cleanup();
    });

    // Test 1: Verifica render del título, descripción y acciones principales.
    it('1. debe renderizar el título y acciones principales', () => {
        renderWithProviders(<PaymentsView />);

        // 1.1 Verifica el título principal de la vista
        expect(
            screen.getByText('Administración de Pagos'),
        ).toBeInTheDocument();

        // 1.2 Verifica la descripción de la vista
        expect(
            screen.getByText('Gestiona los pagos de los integrantes de Alentapp.'),
        ).toBeInTheDocument();

        // 1.3 Verifica las acciones principales
        expect(screen.getByText('Actualizar')).toBeInTheDocument();
        expect(screen.getByText('Agregar Pago')).toBeInTheDocument();
    });

    // Test 2: Verifica estado de carga cuando isLoading es true.
    it('2. debe mostrar estado de carga cuando isLoading es true', () => {
        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            isLoading: true,
        } as any);

        renderWithProviders(<PaymentsView />);

        // 2.1 Verifica que se muestre el mensaje de carga
        expect(screen.getByText('Cargando pagos...')).toBeInTheDocument();
    });

    // Test 3: Verifica mensaje de tabla vacía cuando no hay pagos.
    it('3. debe mostrar mensaje de tabla vacía cuando no hay pagos', () => {
        renderWithProviders(<PaymentsView />);

        // 3.1 Verifica que se muestre el mensaje de listado vacío
        expect(screen.getByText('No se encontraron pagos.')).toBeInTheDocument();

        // 3.2 Verifica que exista la acción de reintentar
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
    });

    // Test 4: Verifica mensaje de error cuando usePayments devuelve error.
    it('4. debe mostrar mensaje de error cuando usePayments devuelve error', () => {
        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            error: 'No se pudieron cargar los pagos',
        } as any);

        renderWithProviders(<PaymentsView />);

        // 4.1 Verifica el bloque de error
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(
            screen.getByText('No se pudieron cargar los pagos'),
        ).toBeInTheDocument();
    });

    // Test 5: Verifica render de tabla y datos cuando existen pagos.
    it('5. debe renderizar la tabla de pagos cuando existen pagos', () => {
        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            payments: [
                {
                    id: 'payment-1',
                    member_id: 'member-1',
                    member: {
                        name: 'Juan Pérez',
                        dni: '12345678',
                    },
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    due_date: '2026-05-10',
                    payment_date: null,
                    status: 'Pendiente',
                },
            ],
        } as any);

        renderWithProviders(<PaymentsView />);

        // 5.1 Verifica columnas principales
        expect(screen.getByText('Nombre del socio')).toBeInTheDocument();
        expect(screen.getByText('DNI')).toBeInTheDocument();
        expect(screen.getByText('Monto')).toBeInTheDocument();
        expect(screen.getByText(/Per.*odo/)).toBeInTheDocument();
        expect(screen.getByText('Estado')).toBeInTheDocument();

        // 5.2 Verifica datos del pago
        expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
        expect(screen.getByText('12345678')).toBeInTheDocument();
        expect(screen.getByText('5/2026')).toBeInTheDocument();
        expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    // Test 6: Verifica que Actualizar dispara fetchPayments.
    it('6. debe llamar a fetchPayments al hacer click en Actualizar', async () => {
        const user = userEvent.setup();

        renderWithProviders(<PaymentsView />);

        // 6.1 Ejecuta la acción de actualizar
        await user.click(screen.getByText('Actualizar'));

        // 6.2 Verifica que se invoque la recarga de pagos
        expect(mockFetchPayments).toHaveBeenCalledOnce();
    });

    // Test 7: Verifica apertura del modal de creación al agregar pago.
    it('7. debe abrir el modal de creación al hacer click en Agregar Pago', async () => {
        const user = userEvent.setup();

        renderWithProviders(<PaymentsView />);

        // 7.1 Ejecuta la acción de agregar pago
        await user.click(screen.getByText('Agregar Pago'));

        // 7.2 Verifica que se limpie la búsqueda de socio
        expect(mockResetMemberSearch).toHaveBeenCalledOnce();

        // 7.3 Verifica que se abra el modal de creación
        expect(mockOpenCreateModal).toHaveBeenCalledOnce();
    });

    // Test 8: Verifica apertura del modal de edición al editar un pago.
    it('8. debe abrir el modal de edición al hacer click en editar pago', async () => {
        const user = userEvent.setup();

        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            payments: [
                {
                    id: 'payment-1',
                    member_id: 'member-1',
                    member: {
                        name: 'Juan Pérez',
                        dni: '12345678',
                    },
                    amount: 15000,
                    month: 5,
                    year: 2026,
                    due_date: '2026-05-10',
                    payment_date: null,
                    status: 'Pendiente',
                },
            ],
        } as any);

        renderWithProviders(<PaymentsView />);

        // 8.1 Ejecuta la acción de editar
        await user.click(screen.getByLabelText('Editar miembro'));

        // 8.2 Verifica que se setee el label del socio
        expect(mockSetMemberSearchValue).toHaveBeenCalledWith(
            'Juan Pérez - DNI: 12345678',
        );

        // 8.3 Verifica que se abra el modal de actualización
        expect(mockOpenUpdateModal).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'payment-1',
            }),
        );
    });

    // Test 9: Verifica apertura del diálogo de cancelación al cancelar un pago.
    it('9. debe abrir el diálogo de cancelación al hacer click en cancelar pago', async () => {
        const user = userEvent.setup();

        const payment = {
            id: 'payment-1',
            member_id: 'member-1',
            member: {
                name: 'Juan Pérez',
                dni: '12345678',
            },
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            payment_date: null,
            status: 'Pendiente',
        };

        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            payments: [payment],
        } as any);

        renderWithProviders(<PaymentsView />);

        // 9.1 Ejecuta la acción de cancelar pago
        await user.click(screen.getByLabelText('Cancelar pago'));

        // 9.2 Verifica que se invoque la apertura del diálogo con el pago
        expect(mockOpenCancelPaymentDialog).toHaveBeenCalledWith(payment);
    });

    // Test 10: Verifica render del diálogo cuando existe paymentToCancel.
    it('10. debe mostrar diálogo de cancelación cuando hay paymentToCancel', () => {
        vi.mocked(usePayments).mockReturnValue({
            ...mockUsePaymentsBase,
            paymentToCancel: {
                id: 'payment-1',
                member_id: 'member-1',
                amount: 15000,
                month: 5,
                year: 2026,
                due_date: '2026-05-10',
                payment_date: null,
                status: 'Pendiente',
            },
        } as any);

        renderWithProviders(<PaymentsView />);

        // 10.1 Verifica el título del diálogo de cancelación
        expect(screen.getByText('Cancelar pago')).toBeInTheDocument();

        // 10.2 Verifica que se muestre el período del pago a cancelar
        expect(screen.getByText('5/2026')).toBeInTheDocument();

        // 10.3 Verifica que se muestre el monto
        expect(screen.getByText(/15\.000,00|15000/)).toBeInTheDocument();
    });
});
