import Fastify, {
  FastifyBaseLogger,
  FastifyError,
  FastifyInstance,
} from 'fastify';
import { DomainError } from '../../domain/Order';
import { OrderRepository } from '../../domain/OrderRepository';
import { OrderNotFoundError } from '../../usecases/GetOrderUseCase';
import { createLogger } from '../observability/logger';
import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from '../observability/metrics';
import { registerRoutes } from './routes';

export interface BuildAppOptions {
  orderRepository: OrderRepository;
  dbHealthCheck?: () => Promise<boolean>;
  loggerLevel?: string;
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const logger = createLogger(
    options.loggerLevel ?? (process.env.NODE_ENV === 'test' ? 'silent' : undefined)
  );

  const app = Fastify({
    logger: logger as unknown as FastifyBaseLogger,
    disableRequestLogging: false,
  });

  app.addHook('onRequest', async (request) => {
    (request as unknown as { startTime: bigint }).startTime = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as unknown as { startTime?: bigint }).startTime;
    const route = request.routeOptions?.url ?? request.url;
    const statusCode = String(reply.statusCode);

    httpRequestsTotal.inc({
      method: request.method,
      route,
      status_code: statusCode,
    });

    if (startTime) {
      const durationNs = Number(process.hrtime.bigint() - startTime);
      const durationSec = durationNs / 1e9;
      httpRequestDurationSeconds.observe(
        {
          method: request.method,
          route,
          status_code: statusCode,
        },
        durationSec
      );
    }
  });

  app.setErrorHandler((error: FastifyError | Error, request, reply) => {
    if (error instanceof OrderNotFoundError) {
      return reply.status(404).send({
        error: 'Not Found',
        message: error.message,
      });
    }

    if (error instanceof DomainError) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
      });
    }

    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
      });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

  app.register(async (instance) => {
    await registerRoutes(instance, {
      orderRepository: options.orderRepository,
      dbHealthCheck: options.dbHealthCheck,
    });
  });

  return app;
}
