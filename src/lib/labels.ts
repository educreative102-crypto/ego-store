import { OrderSource, OrderStatus, PaymentMethod, PaymentStatus, StockPolicy, Category } from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "بانتظار التأكيد",
  CONFIRMED: "مؤكد",
  PAID: "مدفوع",
  SHIPPED: "بالتسليم",
  DELIVERED: "مغلق",
  CANCELLED: "ملغى",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PAID: "bg-indigo-100 text-indigo-800",
  SHIPPED: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export const SOURCE_LABEL: Record<OrderSource, string> = {
  SITE: "الموقع",
  WHATSAPP: "واتساب",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  SHAM_CASH: "تحويل شام كاش",
  COD: "عند الاستلام",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "بانتظار الدفع",
  PAID: "مدفوع",
  REFUNDED: "مسترجع",
};

export const STOCK_POLICY_LABEL: Record<StockPolicy, string> = {
  STOCKED: "مخزون محدود",
  MADE_TO_ORDER: "صنع عند الطلب",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  HOODIE: "هودي",
  TSHIRT: "تيشيرت",
};