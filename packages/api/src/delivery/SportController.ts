import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateSportUseCase } from '../application/Sport/NewSportUseCase.js';
import { GetSportsUseCase } from '../application/Sport/GetSportsUseCase.js';
import { UpdateSportUseCase } from '../application/Sport/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/Sport/DeleteSportUseCase.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

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
        try {
            const deporte = await this.createSportUseCase.execute(request.body);
            return reply.status(201).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('La capacidad máxima debe ser mayor a cero')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const deportes = await this.getSportsUseCase.execute();
            return reply.status(200).send({ data: deportes });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        const allowedFields = ['description', 'max_capacity'];
        const receivedFields = Object.keys(request.body);
        const invalidFields = receivedFields.filter(f => !allowedFields.includes(f));

        if (invalidFields.length > 0) {
            return reply.status(400).send({ error: 'Solo se permite modificar description y max_capacity' });
        }

        try {
            const { id } = request.params;
            const deporte = await this.updateSportUseCase.execute(id, request.body);
            return reply.status(200).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('no se encuentra registrado')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('La capacidad máxima debe ser mayor a cero')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteSportUseCase.execute(id);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('no se encuentra registrado')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

}