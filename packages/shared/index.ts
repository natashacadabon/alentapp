// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
    id: string; // UUID
    dni: string;
    name: string;
    email: string;
    birthdate: string; // ISO Date String (YYYY-MM-DD)
    category: MemberCategory;
    status: MemberStatus;
    created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
    dni: string;
    name: string;
    email: string;
    birthdate: string; // ISO Date String (YYYY-MM-DD)
    category: MemberCategory;
}

export interface UpdateMemberRequest {
    dni?: string;
    name?: string;
    email?: string;
    birthdate?: string; // ISO Date String (YYYY-MM-DD)
    category?: MemberCategory;
    status?: MemberStatus;
}

// ==========================================
// Payment
// ==========================================

export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Vencido' | 'Cancelado';

export interface PaymentDTO {
    id: string; //uuid
    member_id: string; //FK uuid
    amount: number;
    month: number;
    year: number;
    due_date: string; // ISO Date String (YYYY-MM-DD)
    payment_date: string | null; // ISO Date String (YYYY-MM-DD)
    status: PaymentStatus;
    member?: {
        name: string;
        dni: string;
    };
}

export interface CreatePaymentRequest {
    member_id: string;
    amount: number;
    month: number;
    year: number;
    due_date: string; // ISO Date String (YYYY-MM-DD)
    status?: PaymentStatus; // Opcional, por defecto 'Pendiente'
}

export interface UpdatePaymentRequest {
    status?: PaymentStatus;
    payment_date?: string | null;
}

// ==========================================
// Sport
// ==========================================
export interface SportDTO {
    id: string;
    name: string;
    description?: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
}

export interface CreateSportRequest {
    name: string;
    description?: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
}

export interface UpdateSportRequest {
    description?: string;
    max_capacity?: number;
}

// ==========================================
// Medical Certificate
// ==========================================

export interface CreateMedicalCertificateRequest {
    member_id: string;
    issue_date: Date | string;
    expiry_date: Date | string;
    doctor_license: string;
}

export interface MedicalCertificateDTO {
    id: string;
    member_id: string;
    issue_date: Date | string;
    expiry_date: Date | string;
    doctor_license: string;
    is_validated: boolean;
}

export interface UpdateMedicalCertificateRequest {
    issue_date?: Date | string;
    expiry_date?: Date | string;
    doctor_license?: string;
}

// ==========================================
// Locker
// ==========================================
export type LockerStatus = 'Disponible' | 'Ocupado' | 'Mantenimiento';

export interface LockerDTO {
    id: string; // uuid
    member_id: string | null; // FK uuid nullable
    number: number;
    status: LockerStatus;
    location: string;
    member?: {
        name: string;
    } | null;
}

export interface CreateLockerRequest {
    number: number;
    location: string;
    status?: LockerStatus;
    member_id?: string | null;
}

export interface UpdateLockerRequest {
    number?: number;
    status?: LockerStatus;
    location?: string;
    member_id?: string | null;
}
