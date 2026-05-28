import { PaymentRepository } from '../PaymentRepository.js';
import {
    PaymentDTO,
    PaymentStatus,
    UpdatePaymentRequest,
} from '@alentapp/shared';

export class PaymentValidator {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly allowedStatuses: PaymentStatus[] = [
            'Pendiente',
            'Pagado',
            'Vencido',
            'Cancelado',
        ],
    ) {}

    validateFields(data: {
        member_id?: string;
        amount?: number;
        month?: number;
        year?: number;
        due_date?: string;
    }): void {
        if (
            !data.member_id ||
            data.amount === undefined ||
            data.month === undefined ||
            data.year === undefined ||
            !data.due_date
        ) {
            throw new Error('Faltan campos obligatorios');
        }
    }

    validateAmount(amount: number): void {
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    validateMonth(month: number): void {
        if (month < 1 || month > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }
    }

    validateYear(year: number): void {
        if (!Number.isInteger(year) || year < 1900) {
            throw new Error('El año es inválido');
        }
    }

    validateDueDate(dueDate: string): void {
        if (!this.isValidDateOnly(dueDate)) {
            throw new Error('La fecha de vencimiento es inválida');
        }
    }
    validatePaymentCanBeCanceled(payment: PaymentDTO): void {
        if (payment.status === 'Cancelado') {
            throw new Error('El pago ya se encuentra cancelado');
        }
    }
    async validateUniquePayment(
        member_id: string,
        month: number,
        year: number,
        excludePaymentId?: string,
    ): Promise<void> {
        const existingPayment = await this.paymentRepo.findByMemberMonthYear(
            member_id,
            month,
            year,
        );

        if (existingPayment && existingPayment.id !== excludePaymentId) {
            throw new Error(
                'Ya existe un pago para este miembro en el mes y año especificados',
            );
        }
    }

    validateUpdatePayload(data: UpdatePaymentRequest): void {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('El body debe ser un objeto JSON válido');
        }

        const forbiddenFields = [
            'member_id',
            'month',
            'year',
            'due_date',
            'amount',
        ];

        for (const field of forbiddenFields) {
            if (field in data) {
                throw new Error(`No se puede actualizar el campo ${field}`);
            }
        }

        if (!data.status && data.payment_date === undefined) {
            throw new Error('Debe informar al menos un campo para actualizar');
        }
    }

    validateStatus(status: unknown): asserts status is PaymentStatus {
        if (!status || typeof status !== 'string') {
            throw new Error('El estado es obligatorio');
        }

        if (!this.allowedStatuses.includes(status as PaymentStatus)) {
            throw new Error('Estado inválido');
        }
    }

    validatePaymentDate(paymentDate?: string | null): void {
        if (!paymentDate) {
            return;
        }

        if (!this.isValidDateOnly(paymentDate)) {
            throw new Error('La fecha de pago es inválida');
        }
    }

    validatePaymentExists(payment: PaymentDTO | null): asserts payment is PaymentDTO {
        if (!payment) {
            throw new Error('Pago no encontrado');
        }
    }

    validatePaymentCanBeUpdated(payment: PaymentDTO): void {

    if (payment.status === 'Cancelado') {
        throw new Error('No se puede actualizar un pago cancelado');
    }
}

    private isValidDateOnly(dateStr: string): boolean {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return false;
        }

        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));

        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        );
    }
}
