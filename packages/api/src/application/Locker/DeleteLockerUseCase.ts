import { LockerRepository } from '../../domain/LockerRepository.js';

export class DeleteLockerUseCase {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string): Promise<void> {
        const locker = await this.lockerRepository.findById(id);

        if (!locker) {
            throw new Error('El Locker no existe');
        }

        if (locker.status === 'Ocupado') {
            throw new Error(
                'No se puede eliminar un Locker con un socio asignado',
            );
        }

        await this.lockerRepository.delete(id);
    }
}
