import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PostgresMemberRepository } from './infrastructure/PostgresMemberRepository.js';
import { PostgresSportRepository } from './infrastructure/PostgresSportRepository.js';
import { PostgresPaymentRepository } from './infrastructure/PostgresPaymentRepository.js';
import { MemberValidator } from './domain/services/MemberValidator.js';
import { SportValidator } from './domain/services/SportValidator.js';
import { PaymentValidator } from './domain/services/PaymentValidator.js';
import { CreateMemberUseCase } from './application/NewMemberUseCase.js';
import { CreateSportUseCase } from './application/Sport/NewSportUseCase.js';
import { CreatePaymentUseCase } from './application/Payment/NewPaymentUseCase.js';
import { GetMembersUseCase } from './application/GetMembersUseCase.js';
import { GetSportsUseCase } from './application/Sport/GetSportsUseCase.js';
import { GetPaymentsUseCase } from './application/Payment/GetPaymentsUseCase.js';
import { UpdateMemberUseCase } from './application/UpdateMemberUseCase.js';
import { UpdateSportUseCase } from './application/Sport/UpdateSportUseCase.js';
import { DeleteMemberUseCase } from './application/DeleteMemberUseCase.js';
import { DeleteSportUseCase } from './application/Sport/DeleteSportUseCase.js';
import { MemberController } from './delivery/MemberController.js';
import { SportController } from './delivery/SportController.js';
import { PostgresMedicalCertificateRepository } from './infrastructure/PostgresMedicalCertificateRepository.js';
import { CreateMedicalCertificateUseCase } from './application/MedicalCertificate/NewMedicalCertificateUseCase.js';
import { MedicalCertificateController } from './delivery/MedicalCertificateController.js';
import { DeleteMedicalCertificateUseCase } from './application/MedicalCertificate/DeleteMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from './application/MedicalCertificate/UpdateMedicalCertificate.js';
import { MedicalCertificateValidator } from './domain/services/MedicalCertificateValidator.js';
import { GetMedicalCertificatesUseCase } from './application/MedicalCertificate/GetMedicalCertificateUseCase.js';
import { PaymentController } from './delivery/PaymentController.js';
import { DeletePaymentUseCase } from './application/Payment/DeletePaymentUseCase.js';
import { UpdatePaymentUseCase } from './application/Payment/UpdatePaymentUseCase.js';
import { PostgresLockerRepository } from './infrastructure/PostgresLockerRepository.js';
import { LockerValidator } from './domain/services/LockerValidator.js';
import { CreateLockerUseCase } from './application/Locker/NewLockerUseCase.js';
import { GetLockersUseCase } from './application/Locker/GetLockersUseCase.js';
import { UpdateLockerUseCase } from './application/Locker/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from './application/Locker/DeleteLockerUseCase.js';
import { LockerController } from './delivery/LockerController.js';

export function buildApp() {
    const server = Fastify({
        logger: {
            level: 'info',
            transport:
                process.env.NODE_ENV === 'development'
                    ? {
                          target: 'pino-pretty',
                          options: {
                              translateTime: 'HH:MM:ss Z',
                              ignore: 'pid,hostname',
                          },
                      }
                    : undefined,
        },
    });

    server.register(cors, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    const memberRepo = new PostgresMemberRepository();
    const memberValidator = new MemberValidator(memberRepo);

    const createMemberUseCase = new CreateMemberUseCase(
        memberRepo,
        memberValidator,
    );
    const getMembersUseCase = new GetMembersUseCase(memberRepo);
    const updateMemberUseCase = new UpdateMemberUseCase(
        memberRepo,
        memberValidator,
    );
    const deleteMemberUseCase = new DeleteMemberUseCase(memberRepo);

    const sportRepo = new PostgresSportRepository();
    const sportValidator = new SportValidator(sportRepo);

    const createSportUseCase = new CreateSportUseCase(
        sportRepo,
        sportValidator,
    );
    const getSportsUseCase = new GetSportsUseCase(sportRepo);
    const updateSportUseCase = new UpdateSportUseCase(
        sportRepo,
        sportValidator,
    );
    const deleteSportUseCase = new DeleteSportUseCase(sportRepo);

    const memberController = new MemberController(
        createMemberUseCase,
        getMembersUseCase,
        updateMemberUseCase,
        deleteMemberUseCase,
    );

    const sportController = new SportController(
        createSportUseCase,
        getSportsUseCase,
        updateSportUseCase,
        deleteSportUseCase,
    );

    // Medical Certificate
    const medicalCertificateRepo = new PostgresMedicalCertificateRepository();
    const createMedicalCertificateUseCase = new CreateMedicalCertificateUseCase(
        medicalCertificateRepo,
        memberRepo,
    );
    const deleteMedicalCertificateUseCase = new DeleteMedicalCertificateUseCase(
        medicalCertificateRepo,
    );

    const updateMedicalCertificateUseCase = new UpdateMedicalCertificateUseCase(
        medicalCertificateRepo,
        new MedicalCertificateValidator(),
    );
    const getMedicalCertificateUseCase = new GetMedicalCertificatesUseCase(
        medicalCertificateRepo,
    );

    const medicalCertificateController = new MedicalCertificateController(
        createMedicalCertificateUseCase,
        deleteMedicalCertificateUseCase,
        updateMedicalCertificateUseCase,
        getMedicalCertificateUseCase,
    );

    //payment
    const paymentRepo = new PostgresPaymentRepository();
    const paymentValidator = new PaymentValidator(paymentRepo);
    const createPaymentUseCase = new CreatePaymentUseCase(
        paymentRepo,
        paymentValidator,
        memberRepo,
    );
    const getPaymentsUseCase = new GetPaymentsUseCase(paymentRepo);
    const deletePaymentUseCase = new DeletePaymentUseCase(
        paymentRepo,
        paymentValidator,
    );
    const updatePaymentUseCase = new UpdatePaymentUseCase(
        paymentRepo,
        paymentValidator,
    );
    const paymentController = new PaymentController(
        createPaymentUseCase,
        getPaymentsUseCase,
        updatePaymentUseCase,
        deletePaymentUseCase,
    );

    // locker
    const lockerRepo = new PostgresLockerRepository();
    const lockerValidator = new LockerValidator(lockerRepo);
    const createLockerUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator, memberRepo);
    const getLockersUseCase = new GetLockersUseCase(lockerRepo);
    const updateLockerUseCase = new UpdateLockerUseCase(lockerRepo, lockerValidator, memberRepo);
    const deleteLockerUseCase = new DeleteLockerUseCase(lockerRepo);
    const lockerController = new LockerController(createLockerUseCase, getLockersUseCase, updateLockerUseCase, deleteLockerUseCase);

    //Endpoints

    //Member Endpoints
    server.get(
        '/api/v1/socios',
        memberController.getAll.bind(memberController),
    );
    server.post(
        '/api/v1/socios',
        memberController.create.bind(memberController),
    );
    server.put(
        '/api/v1/socios/:id',
        memberController.update.bind(memberController),
    );
    server.delete(
        '/api/v1/socios/:id',
        memberController.delete.bind(memberController),
    );

    //Sport EndPoints
    server.get('/api/v1/sport', sportController.getAll.bind(sportController));
    server.post('/api/v1/sport', sportController.create.bind(sportController));
    server.patch(
        '/api/v1/sport/:id',
        sportController.update.bind(sportController),
    );
    server.delete(
        '/api/v1/sport/:id',
        sportController.delete.bind(sportController),
    );

    //Medical Certificate Endpoints
    server.post(
        '/api/v1/medicalcertificate',
        medicalCertificateController.create.bind(medicalCertificateController),
    );
    server.delete(
        '/api/v1/medicalcertificate/:id',
        medicalCertificateController.delete.bind(medicalCertificateController),
    );
    server.put(
        '/api/v1/medicalcertificate/:id',
        medicalCertificateController.update.bind(medicalCertificateController),
    );
    server.get('/api/v1/medicalcertificate', (request, reply) =>
        medicalCertificateController.getAll(request, reply),
    );

    //Payments Endpoints
    server.get(
        '/api/v1/payments',
        paymentController.getAll.bind(paymentController),
    );
    server.post(
        '/api/v1/payments',
        paymentController.create.bind(paymentController),
    );
    server.delete(
        '/api/v1/payments/:id',
        paymentController.cancel.bind(paymentController),
    );
    server.patch(
        '/api/v1/payments/:id',
        paymentController.update.bind(paymentController),
    );

    //Lockers Endpoints
    server.get('/api/v1/lockers', lockerController.getAll.bind(lockerController));
    server.post('/api/v1/lockers', lockerController.create.bind(lockerController));
    server.patch('/api/v1/lockers/:id', lockerController.update.bind(lockerController));
    server.delete('/api/v1/lockers/:id', lockerController.delete.bind(lockerController));


    server.get('/', async (req, rep) => {
        rep.status(200).send({ msg: 'asd' });
    });

    return server;
}

// Solo iniciar el servidor si el script se ejecuta directamente (no cuando es importado por vitest)
if (process.argv[1] && process.argv[1].endsWith('app.ts')) {
    const server = buildApp();
    const port = parseInt(process.env.PORT || '3000', 10);

    server.listen({ port, host: '0.0.0.0' }, () =>
        server.log.info(`API server running on http://localhost:${port}`),
    );

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, async () => {
            await server.close();
            process.exit(0);
        });
    });
}
