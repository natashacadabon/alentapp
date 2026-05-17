import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBLocker = {
    id: string;
    number: number;
    location: string;
    status: 'Disponible' | 'Ocupado' | 'Mantenimiento';
    member_id: string | null;
    member?: { name: string } | null;
};

function isDuplicateLockerNumber(error: unknown): boolean {
    const err = error as { code?: string; meta?: { target?: unknown } };
    if (err?.code !== 'P2002') return false;
    const target = err.meta?.target;
    if (Array.isArray(target)) return target.includes('number');
    if (typeof target === 'string') return target.includes('number');
    return false;
}

export class PostgresLockerRepository implements LockerRepository {
    async create(data: Omit<LockerDTO, 'id'>): Promise<LockerDTO> {
        try {
            const locker = await prisma.locker.create({
                data: {
                    number: data.number,
                    location: data.location,
                    status: data.status,
                    member_id: data.member_id,
                    deleted_at: null,
                },
            } as any);

            return this.mapToDTO(locker);
        } catch (error) {
            if (isDuplicateLockerNumber(error)) {
                throw new Error('Ya existe un Locker con ese número');
            }
            throw error;
        }
    }

    async findAll(): Promise<LockerDTO[]> {
        const lockers = await prisma.locker.findMany({
            where: {
                deleted_at: null,
            },
            include: {
                member: { select: { name: true } },
            },
            orderBy: { number: 'asc' },
        } as any);

        return lockers.map((locker) => this.mapToDTO(locker));
    }

    async findById(id: string): Promise<LockerDTO | null> {
        const locker = await prisma.locker.findFirst({
            where: {
                id,
                deleted_at: null,
            },
        } as any);

        return locker ? this.mapToDTO(locker) : null;
    }

    async findByNumber(number: number): Promise<LockerDTO | null> {
        const locker = await prisma.locker.findFirst({
            where: {
                number,
                deleted_at: null,
            },
        } as any);

        return locker ? this.mapToDTO(locker) : null;
    }

    async update(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        try {
            const locker = await prisma.locker.update({
                where: { id },
                data: {
                    ...(data.number !== undefined && { number: data.number }),
                    ...(data.location !== undefined && { location: data.location }),
                    ...(data.status !== undefined && { status: data.status }),
                    ...(data.member_id !== undefined && { member_id: data.member_id }),
                },
            });

            return this.mapToDTO(locker);
        } catch (error) {
            if (isDuplicateLockerNumber(error)) {
                throw new Error('Ya existe un Locker con ese número');
            }
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        await prisma.locker.update({
            where: { id },
            data: {
                member_id: null,
                deleted_at: new Date(),
            },
        } as any);
    }

    private mapToDTO(locker: DBLocker): LockerDTO {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            member_id: locker.member_id,
            member: locker.member ?? null,
        };
    }
}
