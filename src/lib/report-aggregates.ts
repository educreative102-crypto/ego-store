export interface SoldLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface ProductAggregate {
  qty: number;
  revenue: number;
  cost: number;
}

export function aggregateSoldItems(items: SoldLine[]): Map<string, ProductAggregate> {
  const byProduct = new Map<string, ProductAggregate>();
  for (const item of items) {
    const entry = byProduct.get(item.productId) ?? { qty: 0, revenue: 0, cost: 0 };
    entry.qty += item.quantity;
    entry.revenue += item.quantity * item.unitPrice;
    entry.cost += item.quantity * item.unitCost;
    byProduct.set(item.productId, entry);
  }
  return byProduct;
}