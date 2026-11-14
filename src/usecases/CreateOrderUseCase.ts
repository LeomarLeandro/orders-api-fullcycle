import { Order, OrderItem } from '../domain/Order';
import { OrderRepository } from '../domain/OrderRepository';

export interface CreateOrderInput {
  customerId: string;
  items: OrderItem[];
}

export class CreateOrderUseCase {
  constructor(private readonly orderRepository: OrderRepository) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const order = Order.create({
      customerId: input.customerId,
      items: input.items,
    });

    await this.orderRepository.save(order);
    return order;
  }
}
