import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetMedicalCertificatesUseCase } from './GetMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO } from '@alentapp/shared';

describe('GetMedicalCertificatesUseCase', () => {
  let mockRepository: MedicalCertificateRepository;
  let useCase: GetMedicalCertificatesUseCase;

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    useCase = new GetMedicalCertificatesUseCase(mockRepository);
  });

  it('debería devolver todos los certificados médicos', async () => {
    const mockCertificates: MedicalCertificateDTO[] = [
      {
        id: 'certificate-1',
        issue_date: new Date('2026-05-01'),
        expiry_date: new Date('2026-12-01'),
        doctor_license: 'MP12345',
        is_validated: true,
        member_id: 'member-1',
      },
      {
        id: 'certificate-2',
        issue_date: new Date('2026-04-10'),
        expiry_date: new Date('2026-10-10'),
        doctor_license: 'MP67890',
        is_validated: false,
        member_id: 'member-2',
      },
    ];

    vi.mocked(mockRepository.findAll).mockResolvedValue(mockCertificates);

    const result = await useCase.execute();

    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCertificates);
  });
});