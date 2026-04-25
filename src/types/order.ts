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
  | 'delivered'
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

// ============ Tracking Detail (from carrier) ============
export interface TrackingDetail {
  message?: string;
  status?: string;
  status_detail?: string;
  datetime?: string;
  source?: string;
  carrier_code?: string;
  tracking_location?: {
    object?: string;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
  };
}

// ============ Shipment ============
export interface Shipment {
  carrier: string;
  trackingNumber: string;
  service?: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  labelUrl?: string;
  trackingStatus?: string;
  trackingDetails?: TrackingDetail[];
  deliveredAt?: string;
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
  paidOnly?: boolean;
  unpaidOnly?: boolean;
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
  /**
   * If true, transition order directly to "shipped" stage and trigger
   * shipping confirmation email. If false (default), tracking is just
   * added (typically used after buying a label, leaves order in "label").
   */
  markShipped?: boolean;
}

// ============ API Config ============
export interface ApiConfig {
  baseUrl: string;
  token?: string;
  shippedOrderStatus: OrderStatus;
}
