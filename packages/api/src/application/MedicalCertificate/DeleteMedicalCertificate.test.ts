import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from './DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';


describe('DeleteMedicalCertificateUseCase', () => { 

    let repository: MedicalCertificateRepository;

    let useCase: DeleteMedicalCertificateUseCase;

    beforeEach(() => {

        repository = {
        // Simula el método que busca un certificado por id
        findById: vi.fn(),
        // Simula el método que elimina un certificado
        delete: vi.fn(),
        } as unknown as MedicalCertificateRepository;

        // Creamos el caso de uso y le pasamos el repositorio
        useCase = new DeleteMedicalCertificateUseCase(repository);
    });

    // Primer test: Verifica que si el certificado existe, se pueda eliminar
    it('debería eliminar un certificado médico existente', async () => {
        
        const certificateId = 'certificate-123';

        // Simulamos que encuentra un certificado con ese id
        vi.mocked(repository.findById).mockResolvedValue({
        id: certificateId,
        issue_date: new Date('2026-01-01'),
        expiry_date: new Date('2026-12-31'),
        doctor_license: 'MP12345',
        is_validated: true,
        member_id: 'member-123',
        });

        // Ejecutamos el caso de uso
        await useCase.execute(certificateId);

        // Verificamos que el método delete haya sido llamado una vez
        expect(repository.delete).toHaveBeenCalledTimes(1);
    });

    // Segundo test: Verifica que delete reciba exactamente el id correcto
    it('debería llamar al delete del repositorio con el id correcto', async () => {

        const certificateId = 'certificate-456';

        vi.mocked(repository.findById).mockResolvedValue({
        id: certificateId,
        issue_date: new Date('2026-01-01'),
        expiry_date: new Date('2026-12-31'),
        doctor_license: 'MP67890',
        is_validated: false,
        member_id: 'member-456',
        });

        await useCase.execute(certificateId);

        // Verificamos que delete haya sido llamado con el mismo id
        expect(repository.delete).toHaveBeenCalledWith(certificateId);
    });


    // Tercer test: Verifica qué pasa cuando el certificado no existe
    it('debería lanzar error si el certificado médico no existe', async () => {

        const certificateId = 'certificate-inexistente';

        vi.mocked(repository.findById).mockResolvedValue(null);

        // Esperamos que al ejecutar el caso de uso se lance un error
        await expect(useCase.execute(certificateId)).rejects.toThrow(
        'Medical certificate not found'
        );

        // Verificamos que delete no haya sido llamado
        expect(repository.delete).not.toHaveBeenCalled();
    });

});