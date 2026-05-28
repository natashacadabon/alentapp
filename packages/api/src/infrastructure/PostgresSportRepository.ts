import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../generated/client/client.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type DBSport = {
    id: string;
    name: string;
    description: string | null;
    max_capacity: number;
    additional_price: Prisma.Decimal;
    requires_medical_certificate: boolean;
};

export class PostgresSportRepository implements SportRepository {
    async create(data: CreateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.create({
            data: {
                name: data.name,
                description: data.description,
                max_capacity: data.max_capacity,
                additional_price: data.additional_price,
                requires_medical_certificate: data.requires_medical_certificate,
            },
        });

        return this.mapToDTO(sport);
    }

    async findByName(name: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { name },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async findAll(): Promise<SportDTO[]> {
        const sports = await prisma.sport.findMany({
            orderBy: { name: 'asc' },
        });
        return sports.map((sport) => this.mapToDTO(sport));
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.update({
            where: { id },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.max_capacity && { max_capacity: data.max_capacity }),
            },
        });

        return this.mapToDTO(sport);
    }

    async delete(id: string): Promise<void> {
        await prisma.sport.delete({
            where: { id },
        });
    }

    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description ?? undefined,
            max_capacity: sport.max_capacity,
            additional_price: Number(sport.additional_price),
            requires_medical_certificate: sport.requires_medical_certificate,
        };
    }
}
