// ============ Order Status (WooCommerce-compatible) ============
export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed';

// ============ Fulfillment Stage (Internal workflow) ============
export type FulfillmentStage = 
  | 'new'
  | 'label'
  | 'shipped'
  | 'issue';

// For backward compatibility
export type FulfillmentStatus = FulfillmentStage;

// ============ Address ============
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ============ Customer ============
export interface Customer {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
}

// ============ Order Item ============
export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

// ============ Shipment ============
export interface Shipment {
  carrier: string;
  trackingNumber: string;
  service?: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  labelUrl?: string;
}

// ============ Order Event ============
export interface OrderEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'note' | 'tracking_added' | 'created' | 'fulfillment_change';
  description: string;
  user?: string;
}

// ============ Order ============
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentStage: FulfillmentStage;
  customer: Customer;
  shippingAddress: Address;
  billingAddress?: Address;
  items: OrderItem[];
  subtotal?: number;
  shippingTotal?: number;
  taxTotal?: number;
  total: number;
  currency?: string;
  shippingMethod: string;
  shipment?: Shipment;
  notes?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

// ============ Paginated Response ============
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Order Filters ============
export interface OrderFilters {
  status?: OrderStatus;
  stage?: FulfillmentStage;
  q?: string;
  page?: number;
  limit?: number;
  sort?: 'createdAt' | '-createdAt' | 'total' | '-total' | 'orderNumber' | '-orderNumber';
}

// ============ Dashboard Metrics ============
export interface DashboardMetrics {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  pendingOrders: number;
  issueOrders: number;
  readyToShip: number;
  totalOrders: number;
  averageTicket: number;
}

// ============ Tracking Payload ============
export interface TrackingPayload {
  carrier: string;
  tracking: string;
  service?: string;
  shippedAt?: string;
  labelUrl?: string;
}

// ============ API Config ============
export interface ApiConfig {
  baseUrl: string;
  token?: string;
  shippedOrderStatus: OrderStatus;
}
