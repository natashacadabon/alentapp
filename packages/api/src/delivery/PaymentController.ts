import { FastifyRequest, FastifyReply } from 'fastify';
import {
    CreatePaymentRequest,
    UpdatePaymentRequest,
} from '@alentapp/shared';

import { CreatePaymentUseCase } from '../application/Payment/NewPaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/Payment/GetPaymentsUseCase.js';
import { DeletePaymentUseCase } from '../application/Payment/DeletePaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/Payment/UpdatePaymentUseCase.js';

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', { unit: 'ms' });
export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
                private readonly deletePaymentUseCase: DeletePaymentUseCase,

    ) {}

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {

        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        try {
            request.log.info('Alguien pegó al endpoint de crear pago');
            const payment = await this.createPaymentUseCase.execute(
                request.body,
            );
            requestCounter.add(1, { method, route, status: '201' });
            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            if (
                error.message.includes('inválido') ||
                error.message.includes('mayor a cero') ||
                error.message.includes('entre 1 y 12') ||
                error.message.includes('año actual o futuro') ||
                error.message.includes('inválida') ||
                error.message.includes('campos obligatorios')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: error.message });
            }

            if (
                error.message.includes(
                    'Ya existe un pago para este miembro en el mes y año especificados',
                )
            ) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: error.message });
            }

            if (error.message.includes('El miembro especificado no existe')) {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: error.message });
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
            const payments = await this.getPaymentsUseCase.execute();
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            console.error('Error obteniendo pagos:', error);
            errorCounter.add(1, { method, route, status: '500' });
            return reply
                .status(500)
                .send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }


    async cancel(
        request: FastifyRequest<{
            Params: { id: string };
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];

        try {
            const { id } = request.params;
            request.log.info({ id }, 'Cancelando pago');
            const payment = await this.deletePaymentUseCase.execute(id);
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            const message =
                error instanceof Error ? error.message : 'Error desconocido';

            if (message === 'Pago no encontrado') {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: message });
            }

            if (
                message === 'El pago ya se encuentra cancelado' ||
                message === 'No se puede cancelar un pago ya pagado'
            ) {
                errorCounter.add(1, { method, route, status: '409' });
                return reply.status(409).send({ error: message });
            }

            request.log.error(
                {
                    message: error?.message,
                    stack: error?.stack,
                    error,
                },
                'Error al cancelar pago',
            );
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
            Body: UpdatePaymentRequest;
        }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        const method = request.method;
        const route = request.routeOptions.url ?? request.url.split('?')[0];
        
        try {
            const { id } = request.params;

            request.log.info(
                { id, body: request.body },
                'Actualizando pago',
            );

            const payment = await this.updatePaymentUseCase.execute(
                id,
                request.body,
            );
            requestCounter.add(1, { method, route, status: '200' });
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            request.log.error(
                {
                    message: error?.message,
                    stack: error?.stack,
                    error,
                },
                'Error al actualizar pago',
            );

            const message =
                error instanceof Error ? error.message : 'Error desconocido';

            if (
                message === 'Estado inválido' ||
                message === 'El estado es obligatorio' ||
                message === 'La fecha de pago es inválida' ||
                message === 'Debe informar al menos un campo para actualizar' ||
                message.startsWith('No se puede actualizar el campo')
            ) {
                errorCounter.add(1, { method, route, status: '400' });
                return reply.status(400).send({ error: message });
            }

            if (message === 'Pago no encontrado') {
                errorCounter.add(1, { method, route, status: '404' });
                return reply.status(404).send({ error: message });
            }
            
            if (message === 'No se puede actualizar un pago ya pagado' ||
                message === 'No se puede actualizar un pago cancelado') {
                    errorCounter.add(1, { method, route, status: '409' });
                    return reply.status(409).send({ error: message });
            }

            errorCounter.add(1, { method, route, status: '500' });
            return reply.status(500).send({
                error: 'Error interno, reintente más tarde',
            });
        } finally {
            requestDuration.record(Date.now() - start, { method, route });
        }
    }
}