import { MedicalCertificateRepository } from "../../domain/MedicalCertificateRepository.js";
import { MedicalCertificateDTO } from "@alentapp/shared";

export class GetMedicalCertificatesUseCase {
  constructor(
    private readonly repository: MedicalCertificateRepository
  ) {}

  async execute(): Promise<MedicalCertificateDTO[]> {
    return this.repository.findAll();
  }
}