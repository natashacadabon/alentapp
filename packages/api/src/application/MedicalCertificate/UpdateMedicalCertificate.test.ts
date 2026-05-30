import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificate.js';
import type { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';
import type { MedicalCertificateValidator } from '../../domain/services/MedicalCertificateValidator.js';
import type { UpdateMedicalCertificateRequest } from '@alentapp/shared';

describe('UpdateMedicalCertificateUseCase', () => {
    let repository: MedicalCertificateRepository;
    let validator: MedicalCertificateValidator;
    let useCase: UpdateMedicalCertificateUseCase;

    beforeEach(() => {
        // Mock del repositorio: el use case busca el certificado activo y luego actualiza.
        repository = {
            findActiveByMemberId: vi.fn(),
            update: vi.fn(),
        } as unknown as MedicalCertificateRepository;

        // Mock del validator: permite controlar validaciones sin probar su implementacion interna.
        validator = {
            validateDates: vi.fn(),
            validateDoctorLicense: vi.fn(),
        } as unknown as MedicalCertificateValidator;

        // Instanciamos el caso de uso con dependencias mockeadas.
        useCase = new UpdateMedicalCertificateUseCase(repository, validator);
    });

    // Primer test: verifica el camino exitoso de actualizacion.
    it('deberia actualizar un certificado medico correctamente', async () => {
        const id = 'certificate-1';

        // Certificado activo existente que devuelve el repositorio.
        const existingCertificate = {
            id,
            issue_date: new Date('2026-05-01'),
            expiry_date: new Date('2026-12-01'),
            doctor_license: 'ABC123',
            is_validated: false,
            member_id: 'member-1',
        };

        // Datos nuevos enviados al caso de uso.
        const updateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: 'XYZ789',
        };

        // Resultado simulado luego de actualizar en el repositorio.
        const updatedCertificate = {
            id,
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: 'XYZ789',
            member_id: 'member-1',
            is_validated: true,
        };

        vi.mocked(repository.findActiveByMemberId).mockResolvedValue(
            existingCertificate,
        );
        vi.mocked(repository.update).mockResolvedValue(updatedCertificate);

        const result = await useCase.execute(id, updateRequest);

        // Verifica que el use case busque el certificado activo.
        expect(repository.findActiveByMemberId).toHaveBeenCalledWith(id);

        // El use case convierte las fechas a Date y se las pasa separadas al validator.
        expect(validator.validateDates).toHaveBeenCalledWith(
            new Date('2026-05-10'),
            new Date('2026-12-10'),
        );

        // El use case valida la matricula recibida.
        expect(validator.validateDoctorLicense).toHaveBeenCalledWith('XYZ789');

        // El repositorio recibe solo los campos permitidos por el caso de uso.
        expect(repository.update).toHaveBeenCalledWith(id, {
            issue_date: updateRequest.issue_date,
            expiry_date: updateRequest.expiry_date,
            doctor_license: updateRequest.doctor_license,
        });

        expect(result).toEqual(updatedCertificate);
    });

    // Segundo test: verifica que una fecha de vencimiento invalida corte la actualizacion.
    it('deberia lanzar error si la fecha de vencimiento no es posterior a la fecha de emision', async () => {
        const certificateId = 'certificate-1';

        const existingCertificate = {
            id: certificateId,
            issue_date: new Date('2026-05-01'),
            expiry_date: new Date('2026-12-01'),
            doctor_license: 'ABC123',
            member_id: 'member-1',
            is_validated: false,
        };

        const invalidUpdateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-12-10'),
            expiry_date: new Date('2026-05-10'),
            doctor_license: 'ABC123',
        };

        vi.mocked(repository.findActiveByMemberId).mockResolvedValue(
            existingCertificate,
        );
        vi.mocked(validator.validateDates).mockImplementation(() => {
            throw new Error(
                'La fecha de vencimiento debe ser posterior a la de emision',
            );
        });

        await expect(
            useCase.execute(certificateId, invalidUpdateRequest),
        ).rejects.toThrow(
            'La fecha de vencimiento debe ser posterior a la de emision',
        );

        expect(repository.findActiveByMemberId).toHaveBeenCalledWith(
            certificateId,
        );
        expect(validator.validateDates).toHaveBeenCalledWith(
            new Date('2026-12-10'),
            new Date('2026-05-10'),
        );
        expect(repository.update).not.toHaveBeenCalled();
    });

    // Tercer test: verifica que una matricula vacia corte la actualizacion.
    it('deberia lanzar error si la matricula del medico esta vacia', async () => {
        const certificateId = 'certificate-1';

        const existingCertificate = {
            id: certificateId,
            issue_date: new Date('2026-05-01'),
            expiry_date: new Date('2026-12-01'),
            doctor_license: 'ABC123',
            member_id: 'member-1',
            is_validated: false,
        };

        const invalidUpdateRequest: UpdateMedicalCertificateRequest = {
            issue_date: new Date('2026-05-10'),
            expiry_date: new Date('2026-12-10'),
            doctor_license: '',
        };

        vi.mocked(repository.findActiveByMemberId).mockResolvedValue(
            existingCertificate,
        );
        vi.mocked(validator.validateDoctorLicense).mockImplementation(() => {
            throw new Error('La matricula del medico es obligatoria');
        });

        await expect(
            useCase.execute(certificateId, invalidUpdateRequest),
        ).rejects.toThrow('La matricula del medico es obligatoria');

        expect(repository.findActiveByMemberId).toHaveBeenCalledWith(
            certificateId,
        );
        expect(validator.validateDoctorLicense).toHaveBeenCalledWith('');
        expect(repository.update).not.toHaveBeenCalled();
    });
});
