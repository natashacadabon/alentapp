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
    vi.resetAllMocks();
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
   * Test 3: Crear un locker exitosamente
   * Valida que al llenar el formulario y enviar, el nuevo locker se crea
   */
  it('debe crear un locker exitosamente y mostrarlo en la tabla', async () => {
    const user = userEvent.setup();
    const newLocker: LockerDTO = {
      id: 'locker-new',
      number: 3,
      location: 'Vestuario C',
      status: 'Disponible',
      member_id: null,
    };

    // Primero devuelve lista vacía, luego después de crear devuelve la lista con el nuevo locker
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([]);
    vi.mocked(lockersService.create).mockResolvedValueOnce(newLocker);
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([newLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText('Cargando lockers...')).not.toBeInTheDocument();
    });

    // Hacemos click en "Agregar Locker"
    const addButton = screen.getByRole('button', { name: /Agregar Locker/i });
    await user.click(addButton);

    // Verificamos que el modal se abre
    await waitFor(() => {
      expect(screen.getByText(/Agregar Nuevo Locker/i)).toBeVisible();
    });

    // Llenamos el formulario
    const numberInput = screen.getByPlaceholderText(/Ej\. 12/i);
    const locationInput = screen.getByPlaceholderText(/Ej\. Vestuario A/i);

    await user.clear(numberInput);
    await user.type(numberInput, '3');
    await user.type(locationInput, 'Vestuario C');

    // Guardamos
    const saveButton = screen.getByRole('button', { name: /Crear Locker/i });
    await user.click(saveButton);

    // Esperamos a que el modal se cierre y el locker aparezca en la tabla
    await waitFor(() => {
      expect(screen.queryByText(/Agregar Nuevo Locker/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Vestuario C')).toBeInTheDocument();
  });

  /**
   * Test 4: Actualizar ubicación de un locker
   * Valida que se pueda cambiar la ubicación de un locker existente
   */
  it('debe actualizar la ubicación de un locker exitosamente', async () => {
    const user = userEvent.setup();
    const updatedLocker: LockerDTO = {
      ...baseLocker,
      location: 'Vestuario A - Fila 1',
    };

    vi.mocked(lockersService.getAll).mockResolvedValueOnce([baseLocker]);
    vi.mocked(lockersService.update).mockResolvedValueOnce(updatedLocker);
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([updatedLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que cargue
    await waitFor(() => {
      expect(screen.getByText('Vestuario A')).toBeInTheDocument();
    });

    // Hacemos click en editar
    const editButtons = screen.getAllByRole('button', { name: /Editar/i });
    await user.click(editButtons[0]);

    // Verificamos que el modal de edición se abre
    await waitFor(() => {
      expect(screen.getByText(/Editar Locker/i)).toBeVisible();
    });

    // Modificamos la ubicación
    const locationInput = screen.getByDisplayValue('Vestuario A');
    await user.clear(locationInput);
    await user.type(locationInput, 'Vestuario A - Fila 1');

    // Guardamos cambios
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    await user.click(saveButton);

    // Verificamos que se actualice la tabla
    await waitFor(() => {
      expect(screen.getByText('Vestuario A - Fila 1')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Vestuario A')).not.toBeInTheDocument();
    });
  });

  /**
   * Test 5: Asignar un locker a un miembro
   * Valida que se pueda asignar un locker disponible a un miembro existente
   */
  it('debe asignar un locker a un miembro exitosamente', async () => {
    const user = userEvent.setup();
    const assignedLocker: LockerDTO = {
      ...baseLocker,
      status: 'Ocupado',
      member_id: 'member-1',
    };

    vi.mocked(lockersService.getAll).mockResolvedValueOnce([baseLocker]);
    vi.mocked(membersService.getAll).mockResolvedValue([memberMock]);
    vi.mocked(lockersService.update).mockResolvedValueOnce(assignedLocker);
    vi.mocked(lockersService.getAll).mockResolvedValueOnce([assignedLocker]);

    renderWithProviders(<LockersView />);

    // Esperamos a que cargue
    await waitFor(() => {
      expect(screen.getByText('Disponible')).toBeInTheDocument();
    });

    // Hacemos click en editar
    const editButtons = screen.getAllByRole('button', { name: /Editar/i });
    await user.click(editButtons[0]);

    // Abrimos el modal de edición
    await waitFor(() => {
      expect(screen.getByText(/Editar Locker/i)).toBeVisible();
    });

    // Buscamos el miembro en el campo de búsqueda
    const memberSearchInput = screen.getByPlaceholderText(/Buscar por nombre o DNI/i);
    await user.type(memberSearchInput, 'Juan');

    // Esperamos que aparezcan los resultados y seleccionamos al miembro
    await waitFor(() => {
      expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
    });

    const memberOption = screen.getByText(/Juan Pérez/i);
    await user.click(memberOption);

    // Guardamos cambios
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
    await user.click(saveButton);

    // Verificamos que el estado cambió a "Ocupado"
    await waitFor(() => {
      expect(screen.getByText('Ocupado')).toBeInTheDocument();
    });
  });

  /**
   * Test 6: Manejo de errores cuando el servicio falla
   * Valida que se muestre un mensaje de error si la API no responde correctamente
   */
  it('debe renderizar un mensaje de error si el servicio backend falla', async () => {
    // Simulamos un error 500
    vi.mocked(lockersService.getAll).mockRejectedValueOnce(
      new Error('Error al conectar con el servidor')
    );

    renderWithProviders(<LockersView />);

    // Esperamos a que se muestre el texto de error en pantalla
    await waitFor(() => {
      expect(
        screen.getByText('Error al conectar con el servidor')
      ).toBeInTheDocument();
    });
  });
});
