import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import {CreateMedicalCertificateRequest, MedicalCertificateDTO, UpdateMedicalCertificateRequest} from '@alentapp/shared';

type DBMedicalCertificate = {
  id: string;
  issue_date: Date;
  expiry_date: Date;
  doctor_license: string;
  is_validated: boolean;
  member_id: string;
  created_at?: Date;
  updated_at?: Date;
};

export class PostgresMedicalCertificateRepository
  implements MedicalCertificateRepository
{

  private prisma?: PrismaClient;


  async findById(id: string): Promise<MedicalCertificateDTO | null> {
    const certificate = await this.getPrisma().medicalCertificate.findUnique({
      where: { id },
    });

    return certificate ? this.mapToDTO(certificate) : null;
  }

  

  async update(
    id: string,
    data: UpdateMedicalCertificateRequest,
  ): Promise<MedicalCertificateDTO> {
  const certificate = await this.getPrisma().medicalCertificate.update({
    where: { id },
    data: {
      ...(data.issue_date !== undefined && {
        issue_date: new Date(data.issue_date),
      }),
      ...(data.expiry_date !== undefined && {
        expiry_date: new Date(data.expiry_date),
      }),
      ...(data.doctor_license !== undefined && {
        doctor_license: data.doctor_license,
      }),
    },
  });

  return this.mapToDTO(certificate);
}

  async delete(id: string): Promise<void> {
    //hard delete
    await this.getPrisma().medicalCertificate.delete({
      where: { id },
    });
  }

  private getPrisma(): PrismaClient {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    this.prisma ??= new PrismaClient({
      adapter: new PrismaPg(process.env.DATABASE_URL),
    });

    return this.prisma;
  }

  async findAll(): Promise<MedicalCertificateDTO[]> {
    const certificates = await this.getPrisma().medicalCertificate.findMany({
      orderBy: { expiry_date: 'desc' },
    });

    return certificates.map((certificate: DBMedicalCertificate) => this.mapToDTO(certificate));
  }

  async create(
    data: CreateMedicalCertificateRequest & { is_validated: boolean },
  ): Promise<MedicalCertificateDTO> {
    const certificate = await this.getPrisma().medicalCertificate.create({
      data: {
        issue_date: new Date(data.issue_date),
        expiry_date: new Date(data.expiry_date),
        doctor_license: data.doctor_license,
        is_validated: data.is_validated,
        member_id: data.member_id,
      },
    });

    return this.mapToDTO(certificate);
  }

  async createReplacingActive(
    data: CreateMedicalCertificateRequest & { is_validated: boolean },
  ): Promise<MedicalCertificateDTO> {
    const certificate = await this.getPrisma().$transaction(async (tx) => {
      await tx.medicalCertificate.updateMany({
        where: {
          member_id: data.member_id,
          is_validated: true,
        },
        data: {
          is_validated: false,
        },
      });

      return tx.medicalCertificate.create({
        data: {
          issue_date: new Date(data.issue_date),
          expiry_date: new Date(data.expiry_date),
          doctor_license: data.doctor_license,
          is_validated: true,
          member_id: data.member_id,
        },
      });
    });

    return this.mapToDTO(certificate);
  }

  async findActiveByMemberId(
    memberId: string,
  ): Promise<MedicalCertificateDTO | null> {
    const certificate = await this.getPrisma().medicalCertificate.findFirst({
      where: {
        member_id: memberId,
        is_validated: true,
      },
    });

    return certificate ? this.mapToDTO(certificate) : null;
  }

  async invalidate(id: string): Promise<void> {
    await this.getPrisma().medicalCertificate.update({
      where: { id },
      data: {
        is_validated: false,
      },
    });
  }

  private mapToDTO(certificate: DBMedicalCertificate): MedicalCertificateDTO {
    return {
      id: certificate.id,
      issue_date: certificate.issue_date,
      expiry_date: certificate.expiry_date,
      doctor_license: certificate.doctor_license,
      is_validated: certificate.is_validated,
      member_id: certificate.member_id,
    };
  }
}