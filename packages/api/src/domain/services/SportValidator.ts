import { SportRepository } from '../SportRepository.js';

export class SportValidator {
    constructor(private readonly sportRepo: SportRepository) {}

    validateMaxCapacity(max_capacity: number): void {
        if (max_capacity <= 0){
            throw new Error('La capacidad máxima debe ser mayor a cero');
        }
    }

    async validateNameIsUnique(name: string): Promise<void> {
        const sportWithSameName = await this.sportRepo.findByName(name);
        if (sportWithSameName) {
            throw new Error('Ya existe un deporte con ese nombre');
        }
    }
}
