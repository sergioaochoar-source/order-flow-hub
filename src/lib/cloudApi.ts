import type { 
  Order, 
  OrderFilters, 
  PaginatedResponse, 
  FulfillmentStage, 
  TrackingPayload,
  DashboardMetrics 
} from '@/types/order';

// Lovable Cloud Edge Function base URL
const getApiBaseUrl = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gmekftctjsytojbdobem';
  return `https://${projectId}.supabase.co/functions/v1/api`;
};

// API Error class
export class CloudApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'CloudApiError';
  }
}

// Fetch client for Cloud API
async function cloudFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new CloudApiError(
      errorData.error || errorData.message || `Request failed: ${response.status}`,
      response.status,
      errorData.code
    );
  }

  return response.json();
}

// Build query params from filters
function buildQueryParams(filters: OrderFilters): string {
  const params = new URLSearchParams();
  
  if (filters.status) params.set('status', filters.status);
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.q) params.set('q', filters.q);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.sort) params.set('sort', filters.sort);
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// ============ API Functions ============

export async function checkHealth(): Promise<{ ok: boolean; timestamp: string }> {
  return cloudFetch('/health');
}

export async function fetchOrders(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
  const queryString = buildQueryParams(filters);
  return cloudFetch(`/orders${queryString}`);
}

export async function fetchOrderById(id: string): Promise<Order> {
  return cloudFetch(`/orders/${id}`);
}

export async function updateOrderStatus(orderId: string, stage: FulfillmentStage): Promise<Order> {
  return cloudFetch(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
}

export async function addOrderTracking(orderId: string, payload: TrackingPayload): Promise<Order> {
  return cloudFetch(`/orders/${orderId}/tracking`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateOrderNotes(orderId: string, notes: string): Promise<{ success: boolean }> {
  return cloudFetch(`/orders/${orderId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return cloudFetch('/metrics');
}

// Cloud API is always "configured" - no external API needed
export function isCloudApiConfigured(): boolean {
  return true;
}
