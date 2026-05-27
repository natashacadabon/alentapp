import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './NewMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';
import { MemberRepository } from '../../domain/MemberRepository.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';


describe('CreateMedicalCertificateUseCase', () => {
    
    // 1. Creamos los mocks de los repositorios de medicalCertificate y Member.
    const mockMedicalCertificateRepo = {
        create: vi.fn(), // Simulamos el método create.
    } as unknown as MedicalCertificateRepository;
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    // 2. Creamos una instancia del caso de uso con el repositorio mockeado.
    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockMemberRepo);

    // Limpia las llamadas anteriores de los mocks antes de cada prueba para evitar interferencias entre pruebas.
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Primer test: caso exitoso. Verificamos que se crea un certificado médico correctamente.
    it('debe crear un certificado médico exitoso si los datos son válidos', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-05-26',
            expiry_date: '2026-12-26',
            doctor_license: 'MN123456',
            is_validated: true,
            member_id: 'member-1',
        };

        // Simulamos la respuesta del repositorio.
        vi.mocked(mockMedicalCertificateRepo.create).mockResolvedValueOnce({
            id: 'certificate-1',
            ...mockRequest,
            created_at: '2026-05-26T00:00:00.000Z',
            updated_at: '2026-05-26T00:00:00.000Z',
        });

        const result = await createMedicalCertificateUseCase.execute(mockRequest);

        // Verificamos que el método create del repositorio fue llamado con los datos correctos.
        expect(mockMedicalCertificateRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                issue_date: '2026-05-26',
                expiry_date: '2026-12-26',
                doctor_license: 'MN123456',
                is_validated: true,
                member_id: 'member-1',
            })
        );

        // Verificamos que el resultado tenga el id esperado.
        expect(result.id).toBe('certificate-1');

        // Verificamos que el resultado conserve la matrícula del médico.
        expect(result.doctor_license).toBe('MN123456');

        // Verificamos que el resultado esté asociado al socio correcto.
        expect(result.member_id).toBe('member-1');
    });


    //Segundo test: Validacion de la licencia del doctor.
    it('debe lanzar un error si la licencia del doctor no existe', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-05-26',
            expiry_date: '2026-12-26',
            doctor_license: '',
            is_validated: true,
            member_id: 'member-1',
        };
        
        await expect(createMedicalCertificateUseCase.execute(mockRequest)).rejects.toThrow();

        // Verificamos que no se haya llamado al repositorio. El certificado no debe guardarse.
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });

    //Tercer test: Validación de member_id. Verifica que no se pueda crear un certificado si no está asociado a ningún socio.
     it('debe lanzar error si falta member_id', async () => {

        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-05-26',
            expiry_date: '2026-12-26',
            doctor_license: 'MN123456',
            is_validated: true,
            member_id: '',
        };

        await expect(createMedicalCertificateUseCase.execute(mockRequest)).rejects.toThrow();

        // Verificamos que no se haya intentado guardar nada.
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });

    //Cuarto test: Validación de fechas. Verifica que no se pueda crear un certificado si la fecha de emisión es posterior a la fecha de expiración.
    it('debe lanzar error si la fecha de emisión es posterior a la fecha de expiración', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-12-26',
            expiry_date: '2026-05-26',
            doctor_license: 'MN123456',
            is_validated: true,
            member_id: 'member-1',
        };


        await expect(createMedicalCertificateUseCase.execute(mockRequest)).rejects.toThrow();

        // Verificamos que no se haya intentado guardar nada.
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });

    //Quinto test: Verificar si el socio existe antes de crear el certificado. 
    it('debe lanzar error si el socio no existe', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-05-26',
            expiry_date: '2026-12-26',
            doctor_license: 'MN123456',
            is_validated: true,
            member_id: 'member-1',
        };

        // Simulamos que el socio no existe.
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(createMedicalCertificateUseCase.execute(mockRequest)).rejects.toThrow();

        // Verificamos que buscó al socio.
        expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');

        // Como el socio no existe, no se debe crear el certificado.
        expect(mockMedicalCertificateRepo.create).not.toHaveBeenCalled();
    });
});