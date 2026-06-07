import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';
import { UpdateMedicalCertificateRequest } from '@alentapp/shared';
import { CreateMedicalCertificateUseCase } from '../application/MedicalCertificate/NewMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../application/MedicalCertificate/DeleteMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../application/MedicalCertificate/UpdateMedicalCertificate.js';
import { GetMedicalCertificatesUseCase } from '../application/MedicalCertificate/GetMedicalCertificateUseCase.js';

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

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

    const start = Date.now();
    const method = request.method;
    const route = request.routeOptions.url ?? request.url.split('?')[0];
    
    try {  
      request.log.info('Iniciando registro de nuevo certificado médico');

      const certificate = await this.createUseCase.execute(request.body);
      requestCounter.add(1, { method, route, status: '201' });
      return reply.status(201).send({ data: certificate });
    } catch (error: any) {
      if (
        error.message.includes('obligatoria') ||
        error.message.includes('posterior') ||
        error.message.includes('no son válidas')
      ) {
        errorCounter.add(1, { method, route, status: '400' });
        return reply.status(400).send({ error: error.message });
      }

      if (error.message.includes('no se encuentra registrado')) {
        errorCounter.add(1, { method, route, status: '404' });
        return reply.status(404).send({ error: error.message });
      }

      request.log.error(
        `[MedicalCertificateController] Error: ${error.message}`,
      );
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async delete(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.routeOptions.url ?? request.url.split('?')[0];
    try {
      const { id } = request.params;

      await this.deleteUseCase.execute(id);
      requestCounter.add(1, { method, route, status: '204' });
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'El certificado indicado no se encuentra') {
        errorCounter.add(1, { method, route, status: '404' });
        return reply.status(404).send({
          error: error.message,
        });
      }

      request.log.error(
        `[MedicalCertificateController] Error: ${error.message}`,
      );
      errorCounter.add(1, { method, route, status: '504' });
      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async getAll(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.routeOptions.url ?? request.url.split('?')[0];
    
    try {
      const medicalCertificates = await this.getUseCase.execute();
      requestCounter.add(1, { method, route, status: '200' });
      return reply.status(200).send({
        data: medicalCertificates,
      });
    } catch (error: any) {
      console.error(
        'Error obteniendo certificados médicos:',
        error,
      );
      errorCounter.add(1, { method, route, status: '500' });
      return reply.status(500).send({
        error: 'Error interno, reintente más tarde',
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

  async update(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateMedicalCertificateRequest;
    }>,
    reply: FastifyReply
  ) {
    const start = Date.now();
    const method = request.method;
    const route = request.routeOptions.url ?? request.url.split('?')[0];

    try {
      const { id } = request.params;
      const body = request.body;

      const updatedCertificate = await this.updateUseCase.execute(id, body);
      requestCounter.add(1, { method, route, status: '200' });
      return reply.code(200).send(updatedCertificate);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'El certificado indicado no se encuentra registrado') {
          errorCounter.add(1, { method, route, status: '404' });
          return reply.code(404).send({ message: error.message });
        }


        if (
          error.message ===
          'La fecha de vencimiento debe ser posterior a la de emisión'
        ) {
          errorCounter.add(1, { method, route, status: '400' });
          return reply.code(400).send({ message: error.message });
        }
      }
      errorCounter.add(1, { method, route, status: '500' });
      return reply.code(500).send({
        message: 'Error interno, reintente más tarde',
      });
    } finally {
      requestDuration.record(Date.now() - start, { method, route });
    }
  }

}