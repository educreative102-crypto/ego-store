import { OrderStatus } from "@prisma/client";

export const SOLD_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.PAID,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];