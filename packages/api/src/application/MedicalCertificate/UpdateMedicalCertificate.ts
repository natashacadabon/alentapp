import { UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { MedicalCertificateRepository } from '../../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../../domain/services/MedicalCertificateValidator.js';

export class UpdateMedicalCertificateUseCase {
  constructor(
    private repository: MedicalCertificateRepository,
    private validator: MedicalCertificateValidator
  ) {}

  async execute(id: string, data: UpdateMedicalCertificateRequest) {
    const certificate = await this.repository.findActiveByMemberId(id);

    if (!certificate) {
      throw new Error('El certificado indicado no se encuentra registrado');
    }

    const issueDate = data.issue_date
  ? new Date(data.issue_date)
  : new Date(certificate.issue_date);

    const expiryDate = data.expiry_date
  ? new Date(data.expiry_date)
  : new Date(certificate.expiry_date);

    this.validator.validateDates(issueDate, expiryDate);
    this.validator.validateDoctorLicense(data.doctor_license);

    const allowedData = {
      issue_date: data.issue_date,
      expiry_date: data.expiry_date,
      doctor_license: data.doctor_license,
    };

    return await this.repository.update(id, allowedData);
  }
}