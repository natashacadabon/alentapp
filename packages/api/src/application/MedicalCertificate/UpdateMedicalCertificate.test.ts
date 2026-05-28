import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificate.js';
import { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../../domain/services/MedicalCertificateValidator.js';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { stringify } from 'querystring';

describe('UpdateMedicalCertificateUseCase', () => {

    let repository: MedicalCertificateRepository;
    let validator: MedicalCertificateValidator;
    let useCase: UpdateMedicalCertificateUseCase;

    beforeEach(() => {
        repository = {
            findById: vi.fn(),
            update: vi.fn(),
        } as unknown as MedicalCertificateRepository;

        validator = {
            validateDates: vi.fn(),
            validateDoctorLicense: vi.fn(),
        } as unknown as MedicalCertificateValidator;

        useCase = new UpdateMedicalCertificateUseCase(repository, validator);
    });

    // Primer test: Verifica que se actualice correctamente un certificado médico existente
    it('debería actualizar un certificado médico correctamente', async () => {
        // Definimos el id del certificado que queremos actualizar
        const id = 'certificate-1';

        // Simulamos un certificado que ya existe en la base de datos
        const existingCertificate = {
            id,
            issue_date: new Date('2026-05-01'),
            expiry_date: new Date('2026-12-01'),
            doctor_license: 'ABC123',
            is_validated: false,
            member_id: 'member-1',
        };

        // Definimos los nuevos datos que queremos actualizar
        const updateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: 'XYZ789',
        };

        // Simulamos cómo debería quedar el certificado después de actualizarse
        const updatedCertificate = {
            id: id,
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: 'ABC123',
            member_id: 'member-1',
            is_validated: true,
        };

        vi.mocked(repository.findById).mockResolvedValue(existingCertificate);

        vi.mocked(repository.update).mockResolvedValue(updatedCertificate);

        const result = await useCase.execute(id, updateRequest);

        expect(repository.findById).toHaveBeenCalledWith(id);

        expect(validator.validateDates).toHaveBeenCalledWith(updateRequest);

        expect(repository.update).toHaveBeenCalledWith(id, updateRequest);

        // Verificamos que el resultado final sea el certificado actualizado
        expect(result).toEqual(updatedCertificate);
    });

    // Segundo test: Verificar si la fecha de vencimiento es anterior a la fecha de emisión
    it('debería lanzar error si la fecha de vencimiento no es posterior a la fecha de emisión', async () => {
        
        const certificateId = 'certificate-1';
    
        const existingCertificate = {
        id: certificateId,
        issue_date: new Date('2026-05-01'),
        expiry_date: new Date('2026-12-01'),
        doctor_license: 'ABC123',
        member_id: 'member-1',
        is_validated: false,
        };

        // Datos inválidos: la fecha de vencimiento es anterior a la fecha de emisión
        const invalidUpdateRequest: UpdateMedicalCertificateRequest = {
        issue_date: new Date('2026-12-10'),
        expiry_date: new Date('2026-05-10'),
        doctor_license: 'ABC123',
        };

        // Simulamos que el certificado existe
        vi.mocked(repository.findById).mockResolvedValue(
        existingCertificate,
        );

        
        await expect(useCase.execute(certificateId, invalidUpdateRequest),).rejects.toThrow(
        'La fecha de vencimiento debe ser posterior a la de emisión',
        );

        // Verificamos que se haya buscado el certificado
        expect(repository.findById).toHaveBeenCalledWith(
        certificateId,
        );

        // Verificamos que no se actualice porque falló la validación
        expect(repository.update).not.toHaveBeenCalled();
    });


    // Tercer test: Verifica que si la matrícula del médico está vacía
        it('debería lanzar error si la matrícula del médico está vacía', async () => {
        const certificateId = 'certificate-1';

        // Certificado existente simulado
        const existingCertificate = {
            id: certificateId,
            issue_date: new Date('2026-05-01'),
            expiry_date: new Date('2026-12-01'),
            doctor_license: 'ABC123',
            member_id: 'member-1',
            is_validated: false,
        };

        // Datos inválidos:
        // la matrícula está vacía
        const invalidUpdateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: '',
        };

        // Simulamos que el certificado existe
        vi.mocked(repository.findById).mockResolvedValue(
        existingCertificate,
        );

        // Esperamos que el use case lance el error del validador validateDoctorLicense
        await expect(
        useCase.execute(certificateId, invalidUpdateRequest),
        ).rejects.toThrow('La matrícula del médico es obligatoria');

        // Verificamos que se haya buscado el certificado
        expect(repository.findById).toHaveBeenCalledWith(
        certificateId,
        );

        // Verificamos que NO se actualice porque falló la validación
        expect(repository.update).not.toHaveBeenCalled();
    });

});