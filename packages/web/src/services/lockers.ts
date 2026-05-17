import type { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

const API_URL =
    (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/v1';

export const lockersService = {
    async getAll(): Promise<LockerDTO[]> {
        const response = await fetch(`${API_URL}/lockers`);
        if (!response.ok) {
            throw new Error('Error al obtener los lockers');
        }
        const result = await response.json();
        return result.data;
    },

    async create(payload: CreateLockerRequest): Promise<LockerDTO> {
        const response = await fetch(`${API_URL}/lockers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al crear el locker');
        }

        return result.data;
    },
};