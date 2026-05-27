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

  
});