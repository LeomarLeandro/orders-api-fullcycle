import { DomainError, Order, OrderStatus } from '../domain/Order';
import { OrderRepository } from '../domain/OrderRepository';

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order with id "${id}" not found`);
    this.name = 'OrderNotFoundError';
  }
}

export class GetOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string): Promise<Order> {
    if (!id || !id.trim()) {
      throw new DomainError('Order id is required');
    }

    const order = await this.orderRepository.findById(id.trim());
    if (!order) {
      throw new OrderNotFoundError(id);
    }

    return order;
  }
}

export class ListOrdersUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(): Promise<Order[]> {
    return this.orderRepository.findAll();
  }
}

export class UpdateOrderStatusUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(id: string, status: OrderStatus): Promise<Order> {
    if (!id || !id.trim()) {
      throw new DomainError('Order id is required');
    }

    const order = await this.orderRepository.findById(id.trim());
    if (!order) {
      throw new OrderNotFoundError(id);
    }

    order.updateStatus(status);
    await this.orderRepository.update(order);

    return order;
  }
}
