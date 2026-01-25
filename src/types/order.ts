export type FulfillmentStatus = 
  | 'new'
  | 'qc'
  | 'pick'
  | 'pack'
  | 'label'
  | 'shipped'
  | 'issue';

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderEvent {
  id: string;
  timestamp: string;
  type: 'status_change' | 'note' | 'tracking_added' | 'created';
  description: string;
  user?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: FulfillmentStatus;
  customer: Customer;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  total: number;
  shippingMethod: string;
  carrier?: string;
  trackingNumber?: string;
  notes?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

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
