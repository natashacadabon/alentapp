import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/Locker/NewLockerUseCase.js';
import { GetLockersUseCase } from '../application/Locker/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../application/Locker/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/Locker/DeleteLockerUseCase.js';

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly getLockersUseCase: GetLockersUseCase,
        private readonly updateLockerUseCase: UpdateLockerUseCase,
        private readonly deleteLockerUseCase: DeleteLockerUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {

        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: locker });
        } catch (error: any) {
            if (
                error.message.includes('El socio no existe') ||
                error.message.includes('debe ser positivo') ||
                error.message.includes('ubicación es obligatoria') ||
                error.message.includes('no puede tener un socio asignado')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }

            if (error.message.includes('Ya existe un Locker con ese número')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply
                .status(500)
                .send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async getAll(request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];
        try {
            const lockers = await this.getLockersUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: lockers });
        } catch {
            errorCounter.add(1, { method, route, status: '500' });
            return reply
                .status(500)
                .send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateLockerRequest;
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        try {
            const { id } = request.params;

            const locker = await this.updateLockerUseCase.execute(
                id,
                request.body,
            );
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: locker });
        } catch (error: any) {
            const message =
                error instanceof Error ? error.message : 'Error desconocido';

            if (
                message === 'El socio no existe' ||
                message === 'El número de Locker debe ser positivo' ||
                message === 'La ubicación es obligatoria' ||
                message === 'Debe informar al menos un campo para actualizar'
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            if (message === 'El Locker no existe') {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: message });
            }

            if (
                message === 'El Locker está en mantenimiento y no puede asignarse' ||
                message ===
                    'No se puede poner en mantenimiento un Locker ocupado. Desasigná el socio primero' ||
                message === 'El Locker ya se encuentra ocupado' ||
                message === 'Ya existe un Locker con ese número'
            ) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply
                .status(500)
                .send({ error: 'Error interno, reintente más tarde' });
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
            await this.deleteLockerUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            const message =
                error instanceof Error ? error.message : 'Error desconocido';

            if (message === 'El Locker no existe') {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: message });
            }

            if (
                message === 'No se puede eliminar un Locker con un socio asignado'
            ) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply
                .status(500)
                .send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}
