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

    // Segundo test: Verifica que se lance un error si el certificado no existe
    it('debería lanzar error si el certificado médico no existe', async () => {
        // Definimos un id de un certificado inexistente
        const id = 'certificate-inexistente';

        // Creamos una solicitud de actualización válida
        const updateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: 'XYZ789',
        };

        // Simulamos que el repositorio no encuentra ningún certificado con ese id
        vi.mocked(repository.findById).mockResolvedValue(null);

        await expect(useCase.execute(id, updateRequest)).rejects.toThrow(
        'El certificado indicado no se encuentra',
        );

        expect(repository.findById).toHaveBeenCalledWith(id);

        // Verificamos que no se haya llamado a update
        expect(repository.update).not.toHaveBeenCalled();
    });

});