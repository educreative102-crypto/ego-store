export function pad(n: number, len = 4): string {
  return String(n).padStart(len, "0");
}

export function nextSku(prefix: string, counter: number): string {
  return `${prefix}-${pad(counter, 3)}`;
}

export function nextOrderNo(counter: number): string {
  return `ORD-${pad(counter)}`;
}

export function nextInvoiceNo(counter: number): string {
  return `INV-${pad(counter)}`;
}