import { Order } from '../../domain/Order';
import { OrderRepository } from '../../domain/OrderRepository';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, this.clone(order));
  }

  async findById(id: string): Promise<Order | null> {
    const order = this.orders.get(id);
    return order ? this.clone(order) : null;
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .map((order) => this.clone(order))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(order: Order): Promise<void> {
    this.orders.set(order.id, this.clone(order));
  }

  clear(): void {
    this.orders.clear();
  }

  private clone(order: Order): Order {
    return Order.restore({
      id: order.id,
      customerId: order.customerId,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: new Date(order.createdAt.getTime()),
      updatedAt: new Date(order.updatedAt.getTime()),
    });
  }
}
