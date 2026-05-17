import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';
import { LockerRepository } from '../../domain/LockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';
import { MemberRepository } from '../../domain/MemberRepository.js';

export class CreateLockerUseCase {
    
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(data: CreateLockerRequest): Promise<LockerDTO> {
        this.lockerValidator.validateNumber(data.number);
        this.lockerValidator.validateLocation(data.location);
        await this.lockerValidator.validateNumberIsUnique(data.number);

        const requestedMemberId = data.member_id ?? null;
        const status =
            data.status ?? (requestedMemberId !== null ? 'Ocupado' : 'Disponible');

        if (status === 'Mantenimiento' && requestedMemberId !== null) {
            throw new Error('Un Locker en mantenimiento no puede tener un socio asignado');
        }

        if (data.status === 'Disponible' && requestedMemberId !== null) {
            throw new Error('Un Locker disponible no puede tener un socio asignado');
        }

        const memberId = requestedMemberId;

        if (memberId !== null) {
            const member = await this.memberRepository.findById(memberId);
            if (!member) {
                throw new Error('El socio no existe');
            }
        }

        return this.lockerRepository.create({
            number: data.number,
            location: data.location,
            status,
            member_id: memberId,
        });
    }
}