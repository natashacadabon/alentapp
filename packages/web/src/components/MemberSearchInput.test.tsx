import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberSearchInput } from './MemberSearchInput';
import { Provider } from './ui/provider';
import type { MemberDTO } from '@alentapp/shared';

describe('MemberSearchInput', () => {
    // Mocks de callbacks para validar interacciones del componente.
    const mockOnSearch = vi.fn();
    const mockOnSelect = vi.fn();

    // Props base del componente para escenario por defecto.
    const baseProps = {
        value: '',
        results: [],
        searchRef: React.createRef<HTMLDivElement>(),
        onSearch: mockOnSearch,
        onSelect: mockOnSelect,
    };

    // Helper de render con Provider para montar el componente con su contexto UI.
    const renderComponent = (
        props: Partial<React.ComponentProps<typeof MemberSearchInput>> = {},
    ) => {
        return render(
            <Provider>
                <MemberSearchInput {...baseProps} {...props} />
            </Provider>,
        );
    };

    // Setup común: reinicia los mocks antes de cada caso.
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Limpieza del DOM para aislar cada escenario.
    afterEach(() => {
        cleanup();
    });

    // Test 1: Verifica render del input de búsqueda.
    it('debe renderizar el input de búsqueda', () => {
        renderComponent();
        expect(
            screen.getByPlaceholderText('Buscar por nombre o DNI'),
        ).toBeInTheDocument();
    });

    // Test 2: Verifica que onSearch se invoque al escribir en el input.
    it('debe llamar a onSearch al escribir en el input', () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre o DNI'), {
        target: { value: 'Juan' },
    });

    expect(mockOnSearch).toHaveBeenCalledWith('Juan');
});

    // Test 3: Verifica render de resultados cuando el componente está habilitado.
    it('debe mostrar resultados cuando no esta deshabilitado', () => {
        renderComponent({
            value: 'Juan',
            results: [
                {
                    id: '1',
                    name: 'Juan Perez',
                    dni: '12345678',
                    email: 'juan.perez@example.com',
                    birthdate: '1990-01-01',
                    category: 'Pleno',
                    status: 'Activo',
                    created_at: '2024-01-01T00:00:00Z',
                },
            ],
        });
        expect(screen.getByText('Juan Perez')).toBeInTheDocument();
        expect(screen.getByText(/DNI:\s*12345678/)).toBeInTheDocument();
    });

    // Test 4: Verifica que onSelect se invoque al seleccionar un resultado.
    it('debe llamar a onSelect al hacer click en un resultado', () => {
        const member: MemberDTO = {
            id: '1',
            name: 'Juan Perez',
            dni: '12345678',
            email: 'juan.perez@example.com',
            birthdate: '1990-01-01',
            category: 'Pleno',
            status: 'Activo',
            created_at: '2024-01-01T00:00:00Z',
        };
        renderComponent({
            value: 'Juan',
            results: [member],
        });
        fireEvent.mouseDown(screen.getByText('Juan Perez'));
        expect(mockOnSelect).toHaveBeenCalledWith(member);
    });

    // Test 5: Verifica que no se muestren resultados cuando está deshabilitado.
    it('no debe mostrar resultados cuando esta deshabilitado', () => {
        renderComponent({
            value: 'Juan',
            results: [
                {
                    id: '1',
                    name: 'Juan Perez',
                    dni: '12345678',
                    email: 'juan.perez@example.com',
                    birthdate: '1990-01-01',
                    category: 'Pleno',
                    status: 'Activo',
                    created_at: '2024-01-01T00:00:00Z',
                },
            ],
            disabled: true,
        });
        expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument();
    });

    // Test 6: Verifica que updateMode deshabilite el input por defecto.
    it('debe quedar deshabilitado en updateMode por defecto', () => {
        renderComponent({
            updateMode: true,
            value: 'Juan Perez - DNI: 12345678',
        });

        expect(
            screen.getByPlaceholderText('Buscar por nombre o DNI'),
        ).toBeDisabled();
    });
});
