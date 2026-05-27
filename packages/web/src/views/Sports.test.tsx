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
  
});