import { describe, expect, it } from 'vitest';
import { DomainError, Order } from '../../src/domain/Order';

describe('Order Domain Entity', () => {
  it('should create a valid order with calculated totalAmount and PENDING status', () => {
    const order = Order.create({
      customerId: 'cust-123',
      items: [
        { productId: 'prod-1', quantity: 2, unitPrice: 50.25 },
        { productId: 'prod-2', quantity: 1, unitPrice: 19.5 },
      ],
    });

    expect(order.id).toBeDefined();
    expect(order.customerId).toBe('cust-123');
    expect(order.status).toBe('PENDING');
    expect(order.totalAmount).toBe(120);
    expect(order.items).toHaveLength(2);
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
  });

  it('should throw DomainError when customerId is empty', () => {
    expect(() =>
      Order.create({
        customerId: '   ',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10 }],
      })
    ).toThrow(DomainError);
  });

  it('should throw DomainError when items array is empty', () => {
    expect(() =>
      Order.create({
        customerId: 'cust-123',
        items: [],
      })
    ).toThrow(DomainError);
  });

  it('should throw DomainError when item has invalid productId, quantity or unitPrice', () => {
    expect(() =>
      Order.create({
        customerId: 'cust-123',
        items: [{ productId: '', quantity: 1, unitPrice: 10 }],
      })
    ).toThrow(DomainError);

    expect(() =>
      Order.create({
        customerId: 'cust-123',
        items: [{ productId: 'prod-1', quantity: 0, unitPrice: 10 }],
      })
    ).toThrow(DomainError);

    expect(() =>
      Order.create({
        customerId: 'cust-123',
        items: [{ productId: 'prod-1', quantity: 1.5, unitPrice: 10 }],
      })
    ).toThrow(DomainError);

    expect(() =>
      Order.create({
        customerId: 'cust-123',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 0 }],
      })
    ).toThrow(DomainError);
  });

  it('should allow valid status transitions: PENDING -> PAID -> SHIPPED -> DELIVERED', () => {
    const order = Order.create({
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
    });

    order.updateStatus('PAID');
    expect(order.status).toBe('PAID');

    order.updateStatus('SHIPPED');
    expect(order.status).toBe('SHIPPED');

    order.updateStatus('DELIVERED');
    expect(order.status).toBe('DELIVERED');
  });

  it('should allow cancelling a PENDING or PAID order', () => {
    const pendingOrder = Order.create({
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
    });
    pendingOrder.updateStatus('CANCELLED');
    expect(pendingOrder.status).toBe('CANCELLED');

    const paidOrder = Order.create({
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
    });
    paidOrder.updateStatus('PAID');
    paidOrder.updateStatus('CANCELLED');
    expect(paidOrder.status).toBe('CANCELLED');
  });

  it('should reject invalid status transitions', () => {
    const order = Order.create({
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 1, unitPrice: 100 }],
    });

    expect(() => order.updateStatus('DELIVERED')).toThrow(DomainError);

    order.updateStatus('CANCELLED');
    expect(() => order.updateStatus('PAID')).toThrow(DomainError);
  });

  it('should serialize to JSON with ISO timestamps and cloned items', () => {
    const order = Order.create({
      id: 'order-1',
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 25.5 }],
    });

    const json = order.toJSON();
    expect(json).toEqual({
      id: 'order-1',
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 2, unitPrice: 25.5 }],
      totalAmount: 51,
      status: 'PENDING',
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    });
  });
});
