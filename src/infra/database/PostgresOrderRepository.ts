import { Pool } from 'pg';
import { Order, OrderItem, OrderStatus } from '../../domain/Order';
import { OrderRepository } from '../../domain/OrderRepository';

interface OrderRow {
  id: string;
  customer_id: string;
  items: OrderItem[] | string;
  total_amount: string | number;
  status: OrderStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly pool: Pool) {}

  async save(order: Order): Promise<void> {
    const query = `
      INSERT INTO orders (id, customer_id, items, total_amount, status, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
    `;
    const values = [
      order.id,
      order.customerId,
      JSON.stringify(order.items),
      order.totalAmount,
      order.status,
      order.createdAt,
      order.updatedAt,
    ];
    await this.pool.query(query, values);
  }

  async findById(id: string): Promise<Order | null> {
    const query = `
      SELECT id, customer_id, items, total_amount, status, created_at, updated_at
      FROM orders
      WHERE id = $1
    `;
    const result = await this.pool.query<OrderRow>(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }
    return this.mapRowToOrder(result.rows[0]);
  }

  async findAll(): Promise<Order[]> {
    const query = `
      SELECT id, customer_id, items, total_amount, status, created_at, updated_at
      FROM orders
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query<OrderRow>(query);
    return result.rows.map((row) => this.mapRowToOrder(row));
  }

  async update(order: Order): Promise<void> {
    const query = `
      UPDATE orders
      SET status = $2, updated_at = $3
      WHERE id = $1
    `;
    await this.pool.query(query, [order.id, order.status, order.updatedAt]);
  }

  async healthCheck(): Promise<boolean> {
    await this.pool.query('SELECT 1');
    return true;
  }

  private mapRowToOrder(row: OrderRow): Order {
    const items: OrderItem[] =
      typeof row.items === 'string' ? JSON.parse(row.items) : row.items;

    return Order.restore({
      id: row.id,
      customerId: row.customer_id,
      items,
      totalAmount: Number(row.total_amount),
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
