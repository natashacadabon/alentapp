import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportsView } from './Sports';
import { sportsService } from '../services/sports';
import { Provider } from '../components/ui/provider';
import type { SportDTO } from '@alentapp/shared';

// Mockeamos el servicio que hace el fetch real para aislar el componente
vi.mock('../services/sports', () => ({
  sportsService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('SportsView - Create', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('debe mostrar el estado de carga y luego renderizar tabla vacía', async () => {
    // Simulamos que el backend no tiene deportes
    vi.mocked(sportsService.getAll).mockResolvedValueOnce([]);

    renderWithProviders(<SportsView />);

    // Verificamos que el spinner de carga aparece inmediatamente
    expect(screen.getByText('Cargando deportes...')).toBeInTheDocument();

    // Esperamos a que la promesa se resuelva
    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });

    // Verificamos que se renderice la interfaz indicando que no hay datos
    expect(screen.getByText('No se encontraron deportes.')).toBeInTheDocument();
  });

  it('debe renderizar la lista de deportes si el backend responde exitosamente', async () => {
    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Fútbol 11', max_capacity: 22, additional_price: 500, requires_medical_certificate: true },
      { id: '2', name: 'Natación', description: null, max_capacity: 15, additional_price: 0, requires_medical_certificate: false },
    ] as SportDTO[];

    vi.mocked(sportsService.getAll).mockResolvedValueOnce(mockSports);

    renderWithProviders(<SportsView />);

    // Esperamos a que los datos se inyecten en el DOM
    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    // Validamos el primer deporte
    expect(screen.getByText('Fútbol 11')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();

    // Validamos el segundo deporte
    expect(screen.getByText('Natación')).toBeInTheDocument();
  });

  it('debe renderizar un mensaje de error si el servicio backend falla', async () => {
    // Simulamos un error 500
    vi.mocked(sportsService.getAll).mockRejectedValueOnce(new Error('Servidor caído'));

    renderWithProviders(<SportsView />);

    // Esperamos a que se muestre el texto de error en pantalla
    await waitFor(() => {
      expect(screen.getByText('Servidor caído')).toBeInTheDocument();
    });
  });

  it('debe abrir el modal de creación al hacer clic en Agregar Deporte', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Simulamos lista vacía para que no haya interferencias
    vi.mocked(sportsService.getAll).mockResolvedValue([]);

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });

    // Hacemos clic en el botón de agregar
    const addButton = screen.getByText(/Agregar Deporte/i);
    await user.click(addButton);

    // Verificamos que el título del modal aparece
    expect(screen.getByText('Agregar Nuevo Deporte')).toBeInTheDocument();
  });

  it('debe permitir crear un nuevo deporte mediante el formulario', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Configuramos el mock para que devuelva algo en todas las llamadas, no solo en la primera
    vi.mocked(sportsService.getAll).mockResolvedValue([]);
    vi.mocked(sportsService.create).mockResolvedValueOnce({
      id: '3', name: 'Voley', description: '', max_capacity: 12, additional_price: 200, requires_medical_certificate: false
    });

    renderWithProviders(<SportsView />);

    // Esperamos que termine de cargar
    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });

    // Hacemos clic en "Agregar Deporte"
    const addButton = screen.getByText(/Agregar Deporte/i);
    await user.click(addButton);

    // Llenamos el formulario
    await user.type(screen.getByPlaceholderText('Ej. Fútbol'), 'Voley');

    const capacidadInput = screen.getByPlaceholderText('Ej. 20');
    await user.clear(capacidadInput); //porque arranca con el valor 1 por defecto en form
    await user.type(capacidadInput, '12');

    const precioInput = screen.getByPlaceholderText('Ej. 500');
    await user.clear(precioInput);
    await user.type(precioInput, '200');

    // Clic en submit
    const submitButton = screen.getByText('Crear Deporte');
    await user.click(submitButton);

    // Verificamos que el servicio create fue llamado con los datos correctos
    expect(sportsService.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Voley',
      max_capacity: 12,
      additional_price: 200,
    }));
  });

  it('debe mostrar error cuando el backend rechaza la creación', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    // Interceptamos el alert del navegador para verificar el mensaje de error
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    vi.mocked(sportsService.getAll).mockResolvedValue([]);
    //mock simula que el backend rechaza la creación con ese erro
    vi.mocked(sportsService.create).mockRejectedValueOnce(new Error('Ya existe un deporte con ese nombre'));

    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.queryByText('Cargando deportes...')).not.toBeInTheDocument();
    });

    const addButton = screen.getByText(/Agregar Deporte/i);
    await user.click(addButton);

    await user.type(screen.getByPlaceholderText('Ej. Fútbol'), 'Fútbol');

    const capacidadInput = screen.getByPlaceholderText('Ej. 20');
    await user.clear(capacidadInput);
    await user.type(capacidadInput, '22');

    const precioInput = screen.getByPlaceholderText('Ej. 500');
    await user.clear(precioInput);
    await user.type(precioInput, '500');

    // Clic en submit
    const submitButton = screen.getByText('Crear Deporte');
    await user.click(submitButton);

    // Verificamos que el alert fue llamado con el mensaje correcto
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Ya existe un deporte con ese nombre');
    });

    alertSpy.mockRestore();
  });
});

describe('SportsView - Update', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe permitir editar un deporte existente', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Desc vieja', max_capacity: 22, additional_price: 500, requires_medical_certificate: true }
    ] as SportDTO[];

    vi.mocked(sportsService.getAll).mockResolvedValue(mockSports);
    vi.mocked(sportsService.update).mockResolvedValueOnce({
      ...mockSports[0],
      description: 'Desc nueva',
      max_capacity: 30,
    });

    renderWithProviders(<SportsView />);

    //espera a que apareza en la pantalla
    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    // Clic en editar
    const editButton = screen.getByLabelText(/Editar deporte/i);
    await user.click(editButton);

    // Verificamos que el modal se abre con los datos del deporte
    expect(screen.getByText('Editar Deporte')).toBeInTheDocument();

    // Modificamos la capacidad
    const capacidadInput = screen.getByDisplayValue(22);
    fireEvent.change(capacidadInput, { target: { value: '30' } });
    
    const descInput = screen.getByDisplayValue('Desc vieja');
    await user.clear(descInput);
    await user.type(descInput, 'Desc nueva');

    // Guardamos
    const submitButton = screen.getByText('Guardar Cambios');
    await user.click(submitButton);

    expect(sportsService.update).toHaveBeenCalledWith('1', expect.objectContaining({
      max_capacity: 30, description: 'Desc nueva'
    }));
  });
});

describe('SportsView - Delete', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<Provider>{ui}</Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe permitir eliminar un deporte con confirmación', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    const mockSports = [
      { id: '1', name: 'Fútbol', description: 'Fútbol 11', max_capacity: 22, additional_price: 500, requires_medical_certificate: true }
    ] as SportDTO[];

    vi.mocked(sportsService.getAll).mockResolvedValue(mockSports);
    vi.mocked(sportsService.delete).mockResolvedValueOnce(undefined);

    // Interceptamos el ConfirmActionDialog — necesitamos simular el clic en confirmar
    renderWithProviders(<SportsView />);

    await waitFor(() => {
      expect(screen.getByText('Fútbol')).toBeInTheDocument();
    });

    // Clic en eliminar
    const deleteButton = screen.getByLabelText(/Eliminar deporte/i);
    await user.click(deleteButton);

    // Verificamos que el modal de confirmación aparece
    expect(screen.getByText('Eliminar Deporte')).toBeInTheDocument();

    // Confirmamos la eliminación
    const confirmButton = screen.getByText('Eliminar');
    await user.click(confirmButton);

    //Comprobamos que el servicio de eliminación fue llamado exactamente con el ID 1
    expect(sportsService.delete).toHaveBeenCalledWith('1');
  });
});