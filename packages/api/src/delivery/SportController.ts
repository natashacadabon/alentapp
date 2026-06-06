import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateSportUseCase } from '../application/Sport/NewSportUseCase.js';
import { GetSportsUseCase } from '../application/Sport/GetSportsUseCase.js';
import { UpdateSportUseCase } from '../application/Sport/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/Sport/DeleteSportUseCase.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly getSportsUseCase: GetSportsUseCase,
        private readonly updateSportUseCase: UpdateSportUseCase,
        private readonly deleteSportUseCase: DeleteSportUseCase,
        
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        try {
            const deporte = await this.createSportUseCase.execute(request.body);
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('La capacidad máxima debe ser mayor a cero')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async getAll(request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];
        try {
            const deportes = await this.getSportsUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: deportes });
        } catch (error: any) {
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {

        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        const allowedFields = ['description', 'max_capacity'];
        const receivedFields = Object.keys(request.body);
        const invalidFields = receivedFields.filter(f => !allowedFields.includes(f));

        if (invalidFields.length > 0) {
            errorCounter.add(1, { method, route, status: '400' });
            requestDuration.record(Date.now() - start, { method, route });
            return reply.status(400).send({ error: 'Solo se permite modificar description y max_capacity' });
        }

        try {

            const { id } = request.params;
            const deporte = await this.updateSportUseCase.execute(id, request.body);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('no se encuentra registrado')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('La capacidad máxima debe ser mayor a cero')) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
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
            await this.deleteSportUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('no se encuentra registrado')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }

}