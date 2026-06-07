import {
    CreatePaymentRequest,
    PaymentDTO,
    UpdatePaymentRequest,
} from '@alentapp/shared';

// Esta interfaz es el "Puerto de Salida". El dominio dice: 
// "No me importa si usás Postgres o Mongo, dame un objeto que cumpla esto".

export interface PaymentRepository {
    create(payment: CreatePaymentRequest): Promise<PaymentDTO>;
    findById(id: string): Promise<PaymentDTO | null>;
    findByMemberId(member_id: string): Promise<PaymentDTO[]>;
    findAll(): Promise<PaymentDTO[]>;
    findByMemberMonthYear(member_id: string, month: number, year: number): Promise<PaymentDTO | null>;
    cancel(id: string): Promise<PaymentDTO>;
    update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO>;
}
