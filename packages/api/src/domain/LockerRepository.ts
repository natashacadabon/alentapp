import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';

export interface LockerRepository {
    create(locker: Omit<LockerDTO, 'id'>): Promise<LockerDTO>;
    findAll(): Promise<LockerDTO[]>;
    findById(id: string): Promise<LockerDTO | null>;
    findByNumber(number: number): Promise<LockerDTO | null>;
    update(id: string, data: UpdateLockerRequest): Promise<LockerDTO>;
    delete(id: string): Promise<void>;
}
