import { FastifyInstance } from 'fastify';
import { ORDER_STATUSES, OrderItem, OrderStatus } from '../../domain/Order';
import { OrderRepository } from '../../domain/OrderRepository';
import { CreateOrderUseCase } from '../../usecases/CreateOrderUseCase';
import {
  GetOrderUseCase,
  ListOrdersUseCase,
  UpdateOrderStatusUseCase,
} from '../../usecases/GetOrderUseCase';
import {
  metricsRegistry,
  ordersCreatedTotal,
  ordersStatusUpdatedTotal,
} from '../observability/metrics';

export interface RoutesDependencies {
  orderRepository: OrderRepository;
  dbHealthCheck?: () => Promise<boolean>;
}

interface CreateOrderBody {
  customerId: string;
  items: OrderItem[];
}

interface OrderParams {
  id: string;
}

interface UpdateStatusBody {
  status: OrderStatus;
}

export async function registerRoutes(
  app: FastifyInstance,
  deps: RoutesDependencies
): Promise<void> {
  const createOrderUseCase = new CreateOrderUseCase(deps.orderRepository);
  const getOrderUseCase = new GetOrderUseCase(deps.orderRepository);
  const listOrdersUseCase = new ListOrdersUseCase(deps.orderRepository);
  const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(deps.orderRepository);

  app.get('/health', async (_request, reply) => {
    let dbStatus: 'up' | 'down' | 'in-memory' = 'in-memory';

    if (deps.dbHealthCheck) {
      try {
        await deps.dbHealthCheck();
        dbStatus = 'up';
      } catch {
        return reply.status(503).send({
          status: 'error',
          database: 'down',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      }
    }

    return reply.status(200).send({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/metrics', async (_request, reply) => {
    const metrics = await metricsRegistry.metrics();
    return reply
      .header('Content-Type', metricsRegistry.contentType)
      .status(200)
      .send(metrics);
  });

  app.post<{ Body: CreateOrderBody }>(
    '/orders',
    {
      schema: {
        body: {
          type: 'object',
          required: ['customerId', 'items'],
          additionalProperties: false,
          properties: {
            customerId: { type: 'string', minLength: 1 },
            items: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['productId', 'quantity', 'unitPrice'],
                additionalProperties: false,
                properties: {
                  productId: { type: 'string', minLength: 1 },
                  quantity: { type: 'integer', minimum: 1 },
                  unitPrice: { type: 'number', exclusiveMinimum: 0 },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const order = await createOrderUseCase.execute(request.body);
      ordersCreatedTotal.inc();
      return reply.status(201).send(order.toJSON());
    }
  );

  app.get('/orders', async (_request, reply) => {
    const orders = await listOrdersUseCase.execute();
    return reply.status(200).send(orders.map((order) => order.toJSON()));
  });

  app.get<{ Params: OrderParams }>('/orders/:id', async (request, reply) => {
    const order = await getOrderUseCase.execute(request.params.id);
    return reply.status(200).send(order.toJSON());
  });

  app.patch<{ Params: OrderParams; Body: UpdateStatusBody }>(
    '/orders/:id/status',
    {
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          additionalProperties: false,
          properties: {
            status: { type: 'string', enum: [...ORDER_STATUSES] },
          },
        },
      },
    },
    async (request, reply) => {
      const order = await updateOrderStatusUseCase.execute(
        request.params.id,
        request.body.status
      );
      ordersStatusUpdatedTotal.inc({ status: order.status });
      return reply.status(200).send(order.toJSON());
    }
  );
}
