export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  parentId: string | null;
  position: number;
  isActive: boolean;
  showOnHome: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  productCount: number | null;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  basePriceInCents: number;
  salePriceInCents: number | null;
  isActive: boolean;
  isFeatured: boolean;
  position: number;
  totalStock: number;
  updatedAt: string;
}

export interface AdminProductVariant {
  id: string;
  sku: string;
  name: string;
  price_in_cents: number | null;
  sale_price_in_cents: number | null;
  stock: number;
  is_active: number;
  position: number;
}

export interface AdminProductImage {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
  is_primary: number;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  categoryId: string;
  basePriceInCents: number;
  salePriceInCents: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  isActive: boolean;
  isFeatured: boolean;
  position: number;
  weightInGrams: number | null;
  widthMm: number | null;
  heightMm: number | null;
  lengthMm: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  variants: AdminProductVariant[];
  images: AdminProductImage[];
}

export interface AdminSetting {
  key: string;
  value: unknown;
  group: string;
  updatedAt: string;
}

export const ORDER_STATUSES = ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  totalInCents: number;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrderItem {
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  unitPriceInCents: number;
  quantity: number;
  subtotalInCents: number;
}

export interface AdminOrderPayment {
  id: string;
  gateway: string;
  gateway_payment_id: string | null;
  method: string;
  status: string;
  amount_in_cents: number;
  paid_at: string | null;
  created_at: string;
}

export interface AdminOrderStatusHistoryEntry {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerEmail: string;
  shippingAddress: { zipCode: string; street: string; number: string; complement: string | null; district: string; city: string; state: string };
  subtotalInCents: number;
  shippingInCents: number;
  discountInCents: number;
  totalInCents: number;
  trackingToken: string;
  internalNote: string | null;
  items: AdminOrderItem[];
  payments: AdminOrderPayment[];
  statusHistory: AdminOrderStatusHistoryEntry[];
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderInCents: number | null;
  maxDiscountInCents: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  usageLimitPerCustomer: number | null;
  isActive: boolean;
}

export interface AdminCustomer {
  email: string;
  name: string;
  orderCount: number;
  totalSpentInCents: number;
  lastOrderAt: string;
}

export interface AdminCustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalInCents: number;
  createdAt: string;
}

export interface AdminAuditLogEntry {
  id: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  changes: unknown;
  denied: boolean;
  ipAddress: string | null;
  createdAt: string;
}
