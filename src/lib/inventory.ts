import { StockPolicy } from "@prisma/client";

export interface VariantBalance {
  stockQty: number;
  confirmedQty: number;
}

export function remaining(balance: VariantBalance): number {
  return Math.max(0, balance.stockQty - balance.confirmedQty);
}

export function isSoldOut(policy: StockPolicy, balance: VariantBalance): boolean {
  return policy === StockPolicy.STOCKED && remaining(balance) <= 0;
}

export function isAvailable(policy: StockPolicy, balance: VariantBalance): boolean {
  return policy === StockPolicy.MADE_TO_ORDER || remaining(balance) > 0;
}

export function canFulfill(policy: StockPolicy, balance: VariantBalance, quantity: number): boolean {
  if (policy === StockPolicy.MADE_TO_ORDER) return true;
  return balance.stockQty - balance.confirmedQty >= quantity;
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return +(unitPrice * quantity).toFixed(2);
}

export function orderTotal(items: { unitPrice: number; quantity: number }[]): number {
  return +items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0).toFixed(2);
}

export function orderCost(items: { unitCost: number; quantity: number }[]): number {
  return +items.reduce((sum, it) => sum + it.unitCost * it.quantity, 0).toFixed(2);
}

export function profit(revenue: number, cost: number): number {
  return +(revenue - cost).toFixed(2);
}

export function profitMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0;
  return +(((revenue - cost) / revenue) * 100).toFixed(1);
}