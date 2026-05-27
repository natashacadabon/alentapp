import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  
  //unit 1- Mostrar estado de carga y tabla vacía
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

  //unit 2 - Renderizar lista de deportes exitosa
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

  //unit 3 - Mostrar error si el servicio falla
  it('debe renderizar un mensaje de error si el servicio backend falla', async () => {
    // Simulamos un error 500
    vi.mocked(sportsService.getAll).mockRejectedValueOnce(new Error('Servidor caído'));

    renderWithProviders(<SportsView />);

    // Esperamos a que se muestre el texto de error en pantalla
    await waitFor(() => {
      expect(screen.getByText('Servidor caído')).toBeInTheDocument();
    });
  });

  //unit 4 - Abrir modal de creación al hacer clic
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

  //unit 5 - Crear un deporte mediante el formulario
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

  
});