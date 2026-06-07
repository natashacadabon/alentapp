import { PaymentRepository
 } from "../../domain/PaymentRepository.js";
import { PaymentDTO, CreatePaymentRequest } from "@alentapp/shared";
import { PaymentValidator } from "../../domain/services/PaymentValidator.js";
import { MemberRepository } from "../../domain/MemberRepository.js";

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator,
        private readonly memberRepository: MemberRepository

    ) {} 
    
    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        //validaciones
        this.paymentValidator.validateAmount(data.amount);
        this.paymentValidator.validateMonth(data.month);
        this.paymentValidator.validateYear(data.year);
        this.paymentValidator.validateDueDate(data.due_date);

        await this.paymentValidator.validateUniquePayment(data.member_id, data.month, data.year);
        //validar que el miembro exista
        const member = await this.memberRepository.findById(data.member_id); // Validar que el miembro exista
        if (!member) {
            throw new Error('El miembro especificado no existe');
        }

        //persistencia
        const newPayment = await this.paymentRepository.create({
            ...data,
            status: 'Pendiente', // Regla de negocio: todos los pagos nuevos son Pendientes

        });
        return newPayment;  
    }
}
