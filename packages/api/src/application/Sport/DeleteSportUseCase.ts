import { SportRepository } from '../../domain/SportRepository.js';

export class DeleteSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
    ) {}

    async execute(id: string): Promise<void> {
        const sport = await this.sportRepository.findById(id);
        if (!sport) {
            throw new Error('El deporte indicado no se encuentra registrado');
        }

        await this.sportRepository.delete(id);
    }
}