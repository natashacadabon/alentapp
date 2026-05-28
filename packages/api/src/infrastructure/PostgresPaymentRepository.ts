import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentDTO, CreatePaymentRequest } from '@alentapp/shared';
import { UpdatePaymentRequest } from '../../../shared/index.js';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type DBPayment = {
    id: string;
    member_id: string;
    amount: number;
    month: number;
    year: number;
    due_date: Date;
    payment_date: Date | null;
    status: 'Pendiente' | 'Pagado' | 'Vencido' | 'Cancelado';
    created_at: Date;
    updated_at: Date;
};

export class PostgresPaymentRepository implements PaymentRepository {
    async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
        const payment = await prisma.payment.create({
            data: {
                member_id: data.member_id,
                amount: data.amount,
                month: data.month,
                year: data.year,
                due_date: new Date(data.due_date),
                status: data.status,
            },
        });
        return this.mapToDTO(payment);
    }

    async findById(id: string): Promise<PaymentDTO | null> {
        const payment = await prisma.payment.findUnique({
            where: { id },
        });
        return payment ? this.mapToDTO(payment) : null;
    }

    async findByMemberId(member_id: string): Promise<PaymentDTO[]> {
        const payments = await prisma.payment.findMany({
            where: { member_id },
            orderBy: { created_at: 'desc' },
        });
        return payments.map(this.mapToDTO);
    }

    async findAll(): Promise<PaymentDTO[]> {
        const payments = await prisma.payment.findMany({
            include: {
                member: {
                    select: {
                        name: true,
                        dni: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });
        return payments.map(this.mapToDTO);
    }

    async findByMemberMonthYear(
        member_id: string,
        month: number,
        year: number,
    ): Promise<PaymentDTO | null> {
        const payment = await prisma.payment.findFirst({
            where: { member_id, month, year },
        });
        return payment ? this.mapToDTO(payment) : null;
    }
    
    async cancel(id: string): Promise<PaymentDTO> {
        const payment = await prisma.payment.update({
            where: { id },
            data: {
                status: 'Cancelado',
                payment_date: null,
            },
        });

        return this.mapToDTO(payment);
    }
    async update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
    const payment = await prisma.payment.update({
        where: { id },
        data: {
            ...(data.status && { status: data.status }),
            ...(data.payment_date !== undefined && {
                payment_date: data.payment_date
                    ? new Date(data.payment_date)
                    : null,
            }),
        },
    });

    return this.mapToDTO(payment);
}

    private mapToDTO(payment: any): PaymentDTO {
        return {
            id: payment.id,
            member_id: payment.member_id,
            amount: Number(payment.amount),
            month: payment.month,
            year: payment.year,
            due_date: payment.due_date.toISOString(),
            status: payment.status,
            payment_date: payment.payment_date
                ? payment.payment_date.toISOString()
                : null,
            member: payment.member
                ? {
                      name: payment.member.name,
                      dni: payment.member.dni,
                  }
                : null,
        };
    }
}
