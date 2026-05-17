import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { CreateMedicalCertificateUseCase } from '../application/MedicalCertificate/NewMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../application/MedicalCertificate/DeleteMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../application/MedicalCertificate/UpdateMedicalCertificate.js';
import { GetMedicalCertificatesUseCase } from '../application/MedicalCertificate/GetMedicalCertificateUseCase.js';

export class MedicalCertificateController {
  constructor(
    private readonly createUseCase: CreateMedicalCertificateUseCase,
    private readonly deleteUseCase: DeleteMedicalCertificateUseCase,
    private readonly updateUseCase: UpdateMedicalCertificateUseCase,
    private readonly getUseCase: GetMedicalCertificatesUseCase
  ) {}

  async create(
    request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
    reply: FastifyReply,
  ) {
    try {
      request.log.info('Iniciando registro de nuevo certificado médico');

      const certificate = await this.createUseCase.execute(request.body);

      return reply.status(201).send({ data: certificate });
    } catch (error: any) {
      if (
        error.message.includes('obligatoria') ||
        error.message.includes('posterior') ||
        error.message.includes('no son válidas')
      ) {
        return reply.status(400).send({ error: error.message });
      }

      if (error.message.includes('no se encuentra registrado')) {
        return reply.status(404).send({ error: error.message });
      }

      request.log.error(
        `[MedicalCertificateController] Error: ${error.message}`,
      );

      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    }
  }
    async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { id } = request.params;

      await this.deleteUseCase.execute(id);

      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'El certificado indicado no se encuentra') {
        return reply.status(404).send({
          error: error.message,
        });
      }

      request.log.error(
        `[MedicalCertificateController] Error: ${error.message}`,
      );

      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    }
  }

    async getAll(
    _request: FastifyRequest,
    reply: FastifyReply,
  ) {
    try {
      const medicalCertificates =
        await this.getUseCase.execute();

      return reply.status(200).send({
        data: medicalCertificates,
      });
    } catch (error: any) {
      console.error(
        'Error obteniendo certificados médicos:',
        error,
      );

      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    }
  }

    async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateMedicalCertificateRequest;
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const body = request.body;

      const updatedCertificate =
        await this.updateUseCase.execute(id, body);

      return reply.code(200).send(updatedCertificate);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'El certificado indicado no se encuentra registrado') {
          return reply.code(404).send({ message: error.message });
        }


        if (
          error.message ===
          'La fecha de vencimiento debe ser posterior a la de emisión'
        ) {
          return reply.code(400).send({ message: error.message });
        }
      }

      return reply.code(500).send({
        message: 'Error interno, reintente más tarde',
      });
    }
  }

}