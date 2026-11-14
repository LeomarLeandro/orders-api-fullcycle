import { randomUUID } from 'node:crypto';

export const ORDER_STATUSES = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderProps {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderProps {
  id?: string;
  customerId: string;
  items: OrderItem[];
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

const VALID_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export class Order {
  private readonly props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = {
      ...props,
      items: props.items.map((item) => ({ ...item })),
    };
  }

  static create(input: CreateOrderProps): Order {
    const customerId = input.customerId?.trim();
    if (!customerId) {
      throw new DomainError('customerId is required and cannot be empty');
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new DomainError('Order must contain at least one item');
    }

    const normalizedItems = input.items.map((item, index) => {
      const productId = item.productId?.trim();
      if (!productId) {
        throw new DomainError(`Item at index ${index} must have a valid productId`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new DomainError(
          `Item "${productId}" must have a positive integer quantity`
        );
      }
      if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice) || item.unitPrice <= 0) {
        throw new DomainError(
          `Item "${productId}" must have a unitPrice greater than zero`
        );
      }
      return {
        productId,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice * 100) / 100,
      };
    });

    const totalAmount = Order.calculateTotal(normalizedItems);
    const now = new Date();

    return new Order({
      id: input.id ?? randomUUID(),
      customerId,
      items: normalizedItems,
      totalAmount,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: OrderProps): Order {
    if (!ORDER_STATUSES.includes(props.status)) {
      throw new DomainError(`Invalid order status: ${props.status}`);
    }
    return new Order(props);
  }

  static calculateTotal(items: OrderItem[]): number {
    const sum = items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    return Math.round(sum * 100) / 100;
  }

  get id(): string {
    return this.props.id;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get items(): OrderItem[] {
    return this.props.items.map((item) => ({ ...item }));
  }

  get totalAmount(): number {
    return this.props.totalAmount;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateStatus(newStatus: OrderStatus): void {
    if (!ORDER_STATUSES.includes(newStatus)) {
      throw new DomainError(`Invalid order status: ${newStatus}`);
    }

    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed.includes(newStatus)) {
      throw new DomainError(
        `Cannot transition order from ${this.props.status} to ${newStatus}`
      );
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      customerId: this.props.customerId,
      items: this.items,
      totalAmount: this.props.totalAmount,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
