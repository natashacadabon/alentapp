import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentFormDialog } from './PaymentFormDialog';
import { DialogRoot } from './ui/dialog';
import { Provider } from './ui/provider';
import type { MemberDTO } from '@alentapp/shared';

describe('PaymentFormDialog', () => {
    // Mocks de callbacks para verificar interacciones sin ejecutar lógica real.
    const mockOnSubmit = vi.fn((event: React.FormEvent) => {
        event.preventDefault();
    });
    const mockOnUpdateField = vi.fn();
    const mockOnUpdateMonth = vi.fn();
    const mockOnUpdateYear = vi.fn();
    const mockOnSearchMember = vi.fn();
    const mockOnSelectMember = vi.fn();

    // Props base para el modo creación; cada test sobrescribe solo lo necesario.
    const baseProps = {
        formData: {
            member_id: '',
            amount: 15000,
            month: 5,
            year: 2026,
            due_date: '2026-06-01',
        },
        isSubmitting: false,
        memberSearch: '',
        memberResults: [],
        memberSearchRef: React.createRef<HTMLDivElement>(),
        onSubmit: mockOnSubmit,
        onUpdateField: mockOnUpdateField,
        onUpdateMonth: mockOnUpdateMonth,
        onUpdateYear: mockOnUpdateYear,
        onSearchMember: mockOnSearchMember,
        onSelectMember: mockOnSelectMember,
    };

    // Helper para renderizar el diálogo abierto con el Provider de la UI.
    const renderDialog = (
        props: Partial<React.ComponentProps<typeof PaymentFormDialog>> = {},
    ) => {
        return render(
            <Provider>
                <DialogRoot open>
                    <PaymentFormDialog {...baseProps} {...props} />
                </DialogRoot>
            </Provider>,
        );
    };

    // Setup común: reinicia contadores y llamadas de todos los mocks.
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Limpia el DOM entre tests para evitar interferencias entre escenarios.
    afterEach(() => {
        cleanup();
    });

    // Test 1: Verifica render de campos y acciones en modo alta de pago.
    it('debe renderizar los campos de alta de pago', () => {
        renderDialog();

        expect(screen.getByText('Agregar Nuevo Pago')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar por nombre o DNI')).toBeInTheDocument();
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2026')).toBeInTheDocument();
        expect(screen.getByDisplayValue('15000')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Pago' })).toBeInTheDocument();
    });

    // Test 2: Verifica que se disparen callbacks al modificar campos del formulario.
    it('debe llamar callbacks al editar campos del alta', async () => {
        const user = userEvent.setup();

        renderDialog();

        await user.type(screen.getByPlaceholderText('Buscar por nombre o DNI'), 'Juan');
        fireEvent.change(screen.getByDisplayValue('5'), {
            target: { value: '6' },
        });
        fireEvent.change(screen.getByDisplayValue('2026'), {
            target: { value: '2027' },
        });
        fireEvent.change(screen.getByDisplayValue('15000'), {
            target: { value: '18000' },
        });
        fireEvent.change(screen.getByDisplayValue('2026-06-01'), {
            target: { value: '2026-07-01' },
        });

        expect(mockOnSearchMember).toHaveBeenCalled();
        expect(mockOnUpdateMonth).toHaveBeenCalledWith('6');
        expect(mockOnUpdateYear).toHaveBeenCalledWith('2027');
        expect(mockOnUpdateField).toHaveBeenCalledWith('amount', 18000);
        expect(mockOnUpdateField).toHaveBeenCalledWith(
            'due_date',
            '2026-07-01',
        );
    });

    // Test 3: Verifica selección de socio desde resultados de búsqueda.
    it('debe permitir seleccionar un socio encontrado', () => {
        const member: MemberDTO = {
            id: 'member-1',
            name: 'Juan Perez',
            dni: '12345678',
            email: 'juan@test.com',
            birthdate: '1990-01-01',
            category: 'Pleno',
            status: 'Activo',
            created_at: '2026-01-01T00:00:00.000Z',
        };

        renderDialog({
            memberSearch: 'Juan',
            memberResults: [member],
        });

        fireEvent.mouseDown(screen.getByText('Juan Perez'));

        expect(mockOnSelectMember).toHaveBeenCalledWith(member);
    });

    // Test 4: Verifica modo edición con campos estructurales deshabilitados.
    it('debe renderizar modo edicion con campos estructurales deshabilitados', () => {
        renderDialog({
            mode: 'update',
            memberSearch: 'Juan Perez - DNI: 12345678',
            formData: {
                ...baseProps.formData,
                status: 'Pendiente',
                payment_date: null,
            },
        });

        expect(
            screen.getByRole('heading', { name: 'Actualizar Pago' }),
        ).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Buscar por nombre o DNI')).toBeDisabled();
        expect(screen.getByDisplayValue('5')).toBeDisabled();
        expect(screen.getByDisplayValue('2026')).toBeDisabled();
        expect(screen.getByDisplayValue('15000')).toBeDisabled();
        expect(screen.getByDisplayValue('2026-06-01')).toBeDisabled();
        expect(screen.getByRole('combobox')).toHaveValue('Pendiente');
        expect(screen.getByRole('button', { name: 'Actualizar Pago' })).toBeInTheDocument();
    });

    // Test 5: Verifica visibilidad de payment_date cuando el estado es Pagado.
    it('debe mostrar fecha de pago cuando el estado es Pagado', () => {
        renderDialog({
            mode: 'update',
            formData: {
                ...baseProps.formData,
                status: 'Pagado',
                payment_date: '2026-06-10',
            },
        });

        expect(screen.getByDisplayValue('2026-06-10')).toBeInTheDocument();
    });

    // Test 6: Verifica envío del formulario al confirmar creación.
    it('debe enviar el formulario', async () => {
        const user = userEvent.setup();

        renderDialog({
            memberSearch: 'Juan Perez',
        });

        await user.click(screen.getByRole('button', { name: 'Crear Pago' }));

        expect(mockOnSubmit).toHaveBeenCalledOnce();
    });
});
