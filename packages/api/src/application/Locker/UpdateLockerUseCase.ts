import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { MemberRepository } from '../../domain/MemberRepository.js';
import { LockerRepository } from '../../domain/LockerRepository.js';
import { LockerValidator } from '../../domain/services/LockerValidator.js';

export class UpdateLockerUseCase {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        this.lockerValidator.validateUpdatePayload(data);

        const locker = await this.lockerRepository.findById(id);
        this.lockerValidator.validateLockerExists(locker);

        if (data.number !== undefined) {
            this.lockerValidator.validateNumber(data.number);

            const lockerWithSameNumber = await this.lockerRepository.findByNumber(
                data.number,
            );
            if (lockerWithSameNumber && lockerWithSameNumber.id !== id) {
                throw new Error('Ya existe un Locker con ese número');
            }
        }

        if (data.location !== undefined) {
            this.lockerValidator.validateLocation(data.location);
        }

        const nextStatus = data.status ?? locker.status;
        const nextMemberId =
            data.member_id !== undefined ? data.member_id : locker.member_id;

        const resolvedStatus =
            nextMemberId !== null && nextMemberId !== undefined
                ? 'Ocupado'
                : nextStatus;

        this.lockerValidator.validateMaintenanceAssignment(
            locker.status,
            resolvedStatus,
            nextMemberId,
        );
        this.lockerValidator.validateOccupiedReassignment(locker, nextMemberId);

        if (data.member_id !== undefined && data.member_id !== null) {
            const member = await this.memberRepository.findById(data.member_id);
            if (!member) {
                throw new Error('El socio no existe');
            }
        }

        return this.lockerRepository.update(id, {
            ...data,
            status: resolvedStatus,
        });
    }
}