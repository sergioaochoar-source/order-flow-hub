import { 
  Order, 
  OrderItem, 
  Customer, 
  Address, 
  OrderEvent, 
  OrderStatus, 
  FulfillmentStage,
  Shipment,
  PaginatedResponse
} from '@/types/order';

/**
 * Normalize raw API response to internal Order type
 * Handles common field naming variations from different backends
 */

// ============ Field Mapping Helpers ============

function normalizeOrderStatus(status: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'pending': 'pending',
    'processing': 'processing',
    'on-hold': 'on-hold',
    'on_hold': 'on-hold',
    'onhold': 'on-hold',
    'completed': 'completed',
    'complete': 'completed',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'refunded': 'refunded',
    'failed': 'failed',
  };
  return statusMap[status.toLowerCase()] || 'processing';
}

function normalizeFulfillmentStage(stage: string): FulfillmentStage {
  const stageMap: Record<string, FulfillmentStage> = {
    'new': 'new',
    'paid': 'new',
    'qc': 'qc',
    'quality_control': 'qc',
    'pick': 'pick',
    'picking': 'pick',
    'pack': 'pack',
    'packing': 'pack',
    'label': 'label',
    'labeling': 'label',
    'labelled': 'label',
    'shipped': 'shipped',
    'dispatched': 'shipped',
    'issue': 'issue',
    'problem': 'issue',
    'hold': 'issue',
  };
  return stageMap[stage.toLowerCase()] || 'new';
}

// ============ Entity Normalizers ============

function normalizeAddress(raw: Record<string, unknown>): Address {
  return {
    line1: String(raw.line1 || raw.address_1 || raw.street || raw.address || ''),
    line2: raw.line2 || raw.address_2 ? String(raw.line2 || raw.address_2) : undefined,
    city: String(raw.city || ''),
    state: String(raw.state || raw.province || raw.region || ''),
    postalCode: String(raw.postalCode || raw.postal_code || raw.postcode || raw.zip || ''),
    country: String(raw.country || raw.country_code || ''),
  };
}

function normalizeCustomer(raw: Record<string, unknown>): Customer {
  const firstName = String(raw.firstName || raw.first_name || '');
  const lastName = String(raw.lastName || raw.last_name || '');
  const fullName = raw.name 
    ? String(raw.name) 
    : `${firstName} ${lastName}`.trim() || 'Unknown Customer';

  return {
    id: String(raw.id || raw.customer_id || raw.customerId || ''),
    name: fullName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: String(raw.email || ''),
    phone: raw.phone ? String(raw.phone) : undefined,
  };
}

function normalizeOrderItem(raw: Record<string, unknown>): OrderItem {
  return {
    id: String(raw.id || raw.item_id || raw.lineItemId || ''),
    sku: String(raw.sku || raw.product_sku || ''),
    name: String(raw.name || raw.product_name || raw.title || ''),
    quantity: Number(raw.quantity || raw.qty || 1),
    price: Number(raw.price || raw.unit_price || raw.subtotal || 0),
    imageUrl: raw.imageUrl || raw.image_url || raw.image ? String(raw.imageUrl || raw.image_url || raw.image) : undefined,
  };
}

function normalizeEvent(raw: Record<string, unknown>): OrderEvent {
  return {
    id: String(raw.id || raw.event_id || `evt_${Date.now()}`),
    timestamp: String(raw.timestamp || raw.created_at || raw.date || new Date().toISOString()),
    type: (raw.type as OrderEvent['type']) || 'status_change',
    description: String(raw.description || raw.message || raw.note || ''),
    user: raw.user ? String(raw.user) : undefined,
  };
}

function normalizeShipment(raw: Record<string, unknown>): Shipment | undefined {
  const carrier = raw.carrier || raw.shipping_carrier;
  const tracking = raw.trackingNumber || raw.tracking_number || raw.tracking;
  
  if (!carrier && !tracking) return undefined;
  
  return {
    carrier: String(carrier || ''),
    trackingNumber: String(tracking || ''),
    service: raw.service ? String(raw.service) : undefined,
    shippedAt: raw.shippedAt || raw.shipped_at ? String(raw.shippedAt || raw.shipped_at) : undefined,
    estimatedDelivery: raw.estimatedDelivery || raw.estimated_delivery ? String(raw.estimatedDelivery || raw.estimated_delivery) : undefined,
  };
}

// ============ Main Order Normalizer ============

export function normalizeOrder(raw: Record<string, unknown>): Order {
  // Handle nested billing/shipping objects
  const billing = raw.billing as Record<string, unknown> | undefined;
  const shipping = raw.shipping as Record<string, unknown> | undefined;
  const shippingAddress = raw.shippingAddress as Record<string, unknown> | undefined;
  const billingAddress = raw.billingAddress as Record<string, unknown> | undefined;
  
  // Handle customer - could be nested or flat
  const customerData = raw.customer as Record<string, unknown> | undefined;
  const customer = customerData 
    ? normalizeCustomer(customerData)
    : normalizeCustomer({
        id: raw.customer_id || raw.customerId,
        name: raw.customer_name || raw.customerName,
        firstName: raw.first_name || raw.firstName || billing?.first_name,
        lastName: raw.last_name || raw.lastName || billing?.last_name,
        email: raw.email || raw.customer_email || billing?.email,
        phone: raw.phone || raw.customer_phone || billing?.phone,
      });

  // Handle line items
  const rawItems = (raw.items || raw.line_items || raw.lineItems || []) as Record<string, unknown>[];
  const items = rawItems.map(normalizeOrderItem);

  // Handle events/history
  const rawEvents = (raw.events || raw.history || raw.timeline || []) as Record<string, unknown>[];
  const events = rawEvents.map(normalizeEvent);

  // Determine fulfillment stage
  const stage = raw.fulfillmentStage || raw.fulfillment_stage || raw.stage || raw.status;
  
  // Handle shipment data
  const shipmentData = raw.shipment as Record<string, unknown> | undefined;
  const shipment = shipmentData 
    ? normalizeShipment(shipmentData)
    : normalizeShipment({
        carrier: raw.carrier,
        trackingNumber: raw.trackingNumber || raw.tracking_number,
        service: raw.shippingMethod || raw.shipping_method,
        shippedAt: raw.shippedAt || raw.shipped_at,
      });

  return {
    id: String(raw.id || raw.order_id || raw.orderId || ''),
    orderNumber: String(raw.orderNumber || raw.order_number || raw.number || `#${raw.id}`),
    status: normalizeOrderStatus(String(raw.status || 'processing')),
    fulfillmentStage: normalizeFulfillmentStage(String(stage || 'new')),
    customer,
    shippingAddress: normalizeAddress(shipping || shippingAddress || raw as Record<string, unknown>),
    billingAddress: billing || billingAddress ? normalizeAddress(billing || billingAddress as Record<string, unknown>) : undefined,
    items,
    subtotal: raw.subtotal ? Number(raw.subtotal) : undefined,
    shippingTotal: raw.shippingTotal || raw.shipping_total ? Number(raw.shippingTotal || raw.shipping_total) : undefined,
    taxTotal: raw.taxTotal || raw.tax_total ? Number(raw.taxTotal || raw.tax_total) : undefined,
    total: Number(raw.total || raw.order_total || 0),
    currency: raw.currency ? String(raw.currency) : undefined,
    shippingMethod: String(raw.shippingMethod || raw.shipping_method || raw.shipping_lines?.[0]?.method_title || 'Standard'),
    shipment,
    notes: raw.notes || raw.customer_note ? String(raw.notes || raw.customer_note) : undefined,
    events,
    createdAt: String(raw.createdAt || raw.created_at || raw.date_created || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.updated_at || raw.date_modified || new Date().toISOString()),
    paidAt: raw.paidAt || raw.paid_at || raw.date_paid ? String(raw.paidAt || raw.paid_at || raw.date_paid) : undefined,
  };
}

// ============ Batch Normalizer ============

export function normalizeOrders(rawOrders: unknown[]): Order[] {
  return rawOrders.map((raw) => normalizeOrder(raw as Record<string, unknown>));
}

// ============ Paginated Response Normalizer ============

export function normalizePaginatedOrders(raw: Record<string, unknown>): PaginatedResponse<Order> {
  // Handle different pagination structures
  const data = (raw.data || raw.orders || raw.results || raw) as unknown[];
  const pagination = raw.pagination || raw.meta || raw.paging;
  
  let page = 1;
  let limit = 20;
  let total = 0;
  let totalPages = 1;

  if (pagination && typeof pagination === 'object') {
    const p = pagination as Record<string, unknown>;
    page = Number(p.page || p.current_page || 1);
    limit = Number(p.limit || p.per_page || p.pageSize || 20);
    total = Number(p.total || p.total_count || p.totalCount || data.length);
    totalPages = Number(p.totalPages || p.total_pages || p.pages || Math.ceil(total / limit));
  } else if (Array.isArray(raw)) {
    total = raw.length;
    totalPages = 1;
  }

  return {
    data: normalizeOrders(Array.isArray(data) ? data : []),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
