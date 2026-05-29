import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockersView } from './Lockers';
import { lockersService } from '../services/lockers';
import { membersService } from '../services/members';
import { Provider } from '../components/ui/provider';
import type { LockerDTO, MemberDTO } from '@alentapp/shared';

// Mockeamos los servicios que hacen fetch real para aislar el componente
vi.mock('../services/lockers', () => ({
  lockersService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../services/members', () => ({
  membersService: {
    getAll: vi.fn(),
  }
}));

describe('LockersView - Integration Tests (TDD_0002)', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  const baseLocker: LockerDTO = {
    id: 'locker-1',
    number: 1,
    location: 'Vestuario A',
    status: 'Disponible',
    member_id: null,
  };

  const memberMock: MemberDTO = {
    id: 'member-1',
    name: 'Juan Pérez',
    dni: '12345678',
    email: 'juan@test.com',
    birthdate: '1990-01-01',
    category: 'Pleno',
    status: 'Activo',
    created_at: '2026-05-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar mocks por defecto
    vi.mocked(lockersService.getAll).mockResolvedValue([]);
    vi.mocked(membersService.getAll).mockResolvedValue([memberMock]);
  });

  /**
   * Test 1: Mostrar estado de carga y tabla vacía
   * Valida que cuando no hay lockers, se muestre el mensaje "No se encontraron lockers"
   */
  it('debe mostrar estado de carga y luego tabla vacía cuando no hay lockers', async () => {
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<LockersView />);

    // Verificamos que el spinner de carga aparece inmediatamente
    expect(screen.getByText('Cargando lockers...')).toBeInTheDocument();

    // Esperamos a que la promesa se resuelva
    await waitFor(() => {
      expect(screen.queryByText('Cargando lockers...')).not.toBeInTheDocument();
    });

    // Verificamos que se renderice el mensaje de tabla vacía
    expect(screen.getByText('No se encontraron lockers.')).toBeInTheDocument();
  });

  /**
   * Test 2: Mostrar lista de lockers exitosa
   * Valida que los lockers disponibles se renderizen correctamente en la tabla
   */
  it('debe renderizar la lista de lockers si el backend responde exitosamente', async () => {
    const mockLockers = [
      { ...baseLocker, id: 'locker-1', number: 1 },
      {
        ...baseLocker,
        id: 'locker-2',
        number: 2,
        location: 'Vestuario B',
        status: 'Ocupado',
        member_id: 'member-1',
      },
    ] as LockerDTO[];

    vi.mocked(lockersService.getAll).mockResolvedValueOnce(mockLockers);

    renderWithProviders(<LockersView />);

    // Esperamos a que los datos se inyecten en el DOM
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Validamos que ambos lockers aparezcan en la tabla
    expect(screen.getByText('Vestuario A')).toBeInTheDocument();
    expect(screen.getByText('Vestuario B')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
    expect(screen.getByText('Ocupado')).toBeInTheDocument();
  });

  /**
   * Test 3: Verificar que el componente renderiza correctamente con spinner de carga
   * Valida que el estado de carga se muestre mientras se traen los datos
   */
  it('debe mostrar el spinner de carga mientras se cargan los lockers', async () => {
    vi.mocked(lockersService.getAll).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([baseLocker]), 100);
        })
    );

    renderWithProviders(<LockersView />);

    // Verificamos que el spinner aparece
    expect(screen.getByText('Cargando lockers...')).toBeInTheDocument();

    // Esperamos a que desaparezca
    await waitFor(() => {
      expect(screen.queryByText('Cargando lockers...')).not.toBeInTheDocument();
    });

    // Verificamos que el locker aparece
    expect(screen.getByText('Vestuario A')).toBeInTheDocument();
  });

  /**
   * Test 4: Verificar que existe el botón de agregar locker
   * Valida que la interfaz tenga el botón para crear nuevos lockers
   */
  it('debe mostrar el botón para agregar nuevo locker', async () => {
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([baseLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que cargue
    await waitFor(() => {
      expect(screen.getByText('Vestuario A')).toBeInTheDocument();
    });

    // Verificamos que existe el botón "Agregar Locker"
    const addButton = screen.getByRole('button', { name: /Agregar Locker/i });
    expect(addButton).toBeInTheDocument();
  });

  /**
   * Test 5: Validar que el formulario de creación funciona correctamente
   * Verifica que se valide la entrada de datos antes de crear
   */
  it('debe mostrar los botones de acción (editar y eliminar) en la tabla', async () => {
    const user = userEvent.setup();

    vi.mocked(lockersService.getAll).mockResolvedValueOnce([baseLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que cargue el locker
    await waitFor(() => {
      expect(screen.getByText('Vestuario A')).toBeInTheDocument();
    });

    // Verificamos que los botones de acción existan
    const editButtons = screen.getAllByRole('button', { name: /Editar locker/i });
    const deleteButtons = screen.getAllByRole('button', { name: /Eliminar locker/i });

    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  /**
   * Test 6: Verificar estructura de la tabla
   * Valida que la tabla tenga las columnas correctas
   */
  it('debe mostrar las columnas correctas en la tabla', async () => {
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([baseLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que cargue
    await waitFor(() => {
      expect(screen.getByText('Vestuario A')).toBeInTheDocument();
    });

    // Verificamos que existan los headers de la tabla
    expect(screen.getByText('N° Locker')).toBeInTheDocument();
    expect(screen.getByText('Ubicación')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Socio asignado')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });
});
