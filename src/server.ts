import 'dotenv/config';
import { Pool } from 'pg';
import { OrderRepository } from './domain/OrderRepository';
import { InMemoryOrderRepository } from './infra/database/InMemoryOrderRepository';
import { PostgresOrderRepository } from './infra/database/PostgresOrderRepository';
import { buildApp } from './infra/http/app';
import { logger } from './infra/observability/logger';

async function bootstrap(): Promise<void> {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const useInMemory = process.env.USE_IN_MEMORY === 'true';

  let pool: Pool | undefined;
  let orderRepository: OrderRepository;
  let dbHealthCheck: (() => Promise<boolean>) | undefined;

  if (useInMemory) {
    orderRepository = new InMemoryOrderRepository();
    logger.info('Using InMemoryOrderRepository');
  } else {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'orders_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const pgRepo = new PostgresOrderRepository(pool);
    orderRepository = pgRepo;
    dbHealthCheck = () => pgRepo.healthCheck();
    logger.info('Using PostgresOrderRepository');
  }

  const app = buildApp({
    orderRepository,
    dbHealthCheck,
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down server...');
    await app.close();
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host });
    logger.info({ port, host }, 'Orders API server started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    if (pool) {
      await pool.end();
    }
    process.exit(1);
  }
}

void bootstrap();
