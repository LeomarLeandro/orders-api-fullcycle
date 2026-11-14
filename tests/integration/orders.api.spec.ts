import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { FastifyInstance } from 'fastify';
import { InMemoryOrderRepository } from '../../src/infra/database/InMemoryOrderRepository';
import { buildApp } from '../../src/infra/http/app';

describe('Orders API Integration Tests', () => {
  let app: FastifyInstance;
  let repository: InMemoryOrderRepository;

  beforeAll(async () => {
    repository = new InMemoryOrderRepository();
    app = buildApp({
      orderRepository: repository,
      loggerLevel: 'silent',
    });
    await app.ready();
  });

  beforeEach(() => {
    repository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health & GET /metrics', () => {
    it('should return 200 OK on /health', async () => {
      const response = await request(app.server).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database).toBe('in-memory');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return 503 when dbHealthCheck fails', async () => {
      const failingApp = buildApp({
        orderRepository: repository,
        loggerLevel: 'silent',
        dbHealthCheck: async () => {
          throw new Error('DB connection lost');
        },
      });
      await failingApp.ready();

      const response = await request(failingApp.server).get('/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('error');
      expect(response.body.database).toBe('down');

      await failingApp.close();
    });

    it('should return Prometheus metrics on /metrics', async () => {
      await request(app.server).get('/health');
      const response = await request(app.server).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('http_requests_total');
      expect(response.text).toContain('http_request_duration_seconds');
    });
  });

  describe('POST /orders', () => {
    it('should create a new order and return 201', async () => {
      const payload = {
        customerId: 'customer-001',
        items: [
          { productId: 'sku-100', quantity: 2, unitPrice: 49.9 },
          { productId: 'sku-200', quantity: 1, unitPrice: 100.2 },
        ],
      };

      const response = await request(app.server).post('/orders').send(payload);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.customerId).toBe('customer-001');
      expect(response.body.totalAmount).toBe(200);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 400 when payload is invalid', async () => {
      const response = await request(app.server).post('/orders').send({
        customerId: '',
        items: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /orders & GET /orders/:id', () => {
    it('should list created orders', async () => {
      await request(app.server)
        .post('/orders')
        .send({
          customerId: 'customer-001',
          items: [{ productId: 'sku-1', quantity: 1, unitPrice: 25 }],
        });

      await request(app.server)
        .post('/orders')
        .send({
          customerId: 'customer-002',
          items: [{ productId: 'sku-2', quantity: 3, unitPrice: 10 }],
        });

      const response = await request(app.server).get('/orders');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should get an order by id', async () => {
      const created = await request(app.server)
        .post('/orders')
        .send({
          customerId: 'customer-001',
          items: [{ productId: 'sku-1', quantity: 2, unitPrice: 30 }],
        });

      const response = await request(app.server).get(`/orders/${created.body.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(created.body.id);
      expect(response.body.totalAmount).toBe(60);
    });

    it('should return 404 when order does not exist', async () => {
      const response = await request(app.server).get('/orders/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('PATCH /orders/:id/status', () => {
    it('should update order status through valid transitions', async () => {
      const created = await request(app.server)
        .post('/orders')
        .send({
          customerId: 'customer-001',
          items: [{ productId: 'sku-1', quantity: 1, unitPrice: 99.9 }],
        });

      const paid = await request(app.server)
        .patch(`/orders/${created.body.id}/status`)
        .send({ status: 'PAID' });

      expect(paid.status).toBe(200);
      expect(paid.body.status).toBe('PAID');

      const shipped = await request(app.server)
        .patch(`/orders/${created.body.id}/status`)
        .send({ status: 'SHIPPED' });

      expect(shipped.status).toBe(200);
      expect(shipped.body.status).toBe('SHIPPED');
    });

    it('should return 400 on invalid domain transition', async () => {
      const created = await request(app.server)
        .post('/orders')
        .send({
          customerId: 'customer-001',
          items: [{ productId: 'sku-1', quantity: 1, unitPrice: 99.9 }],
        });

      const response = await request(app.server)
        .patch(`/orders/${created.body.id}/status`)
        .send({ status: 'DELIVERED' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });

    it('should return 404 when updating status of non-existent order', async () => {
      const response = await request(app.server)
        .patch('/orders/missing-id/status')
        .send({ status: 'PAID' });

      expect(response.status).toBe(404);
    });
  });
});
