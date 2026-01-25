import { 
  Order, 
  FulfillmentStage, 
  DashboardMetrics, 
  OrderFilters, 
  PaginatedResponse,
  TrackingPayload,
  OrderStatus
} from '@/types/order';
import { normalizeOrder, normalizePaginatedOrders } from './normalize';

// ============ Storage Keys ============
const API_BASE_URL_KEY = 'fulfillment_api_base_url';
const API_TOKEN_KEY = 'fulfillment_api_token';
const SHIPPED_STATUS_KEY = 'fulfillment_shipped_status';

// ============ Config Getters/Setters ============

export function getApiBaseUrl(): string {
  return localStorage.getItem(API_BASE_URL_KEY) || '';
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(API_BASE_URL_KEY, url);
}

export function getApiToken(): string {
  return localStorage.getItem(API_TOKEN_KEY) || '';
}

export function setApiToken(token: string): void {
  if (token) {
    localStorage.setItem(API_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(API_TOKEN_KEY);
  }
}

export function getShippedOrderStatus(): OrderStatus {
  return (localStorage.getItem(SHIPPED_STATUS_KEY) as OrderStatus) || 'completed';
}

export function setShippedOrderStatus(status: OrderStatus): void {
  localStorage.setItem(SHIPPED_STATUS_KEY, status);
}

export function isApiConfigured(): boolean {
  const url = getApiBaseUrl();
  return url.length > 0;
}

export function clearApiConfig(): void {
  localStorage.removeItem(API_BASE_URL_KEY);
  localStorage.removeItem(API_TOKEN_KEY);
}

// ============ API Error ============

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public code?: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Extract user-friendly message from API error response
   */
  static parseMessage(data: unknown, fallback: string): string {
    if (!data || typeof data !== 'object') return fallback;
    
    const obj = data as Record<string, unknown>;
    // Support various error response formats
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.detail === 'string') return obj.detail;
    if (obj.errors && Array.isArray(obj.errors) && obj.errors.length > 0) {
      return String(obj.errors[0]);
    }
    return fallback;
  }
}

// ============ Central Fetch Client ============

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getApiToken();
  
  if (!baseUrl) {
    throw new ApiError('API Base URL not configured. Please set it in Settings.');
  }

  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Add auth token if configured
  if (token) {
    headers['X-PEPTIUM-KEY'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    
    // Parse error code from response
    const errorCode = errorData && typeof errorData === 'object' 
      ? (errorData as Record<string, unknown>).code as string | undefined
      : undefined;
    
    // Get user-friendly message
    const message = ApiError.parseMessage(
      errorData, 
      `API Error: ${response.status} ${response.statusText}`
    );
    
    throw new ApiError(
      message,
      response.status,
      response.statusText,
      errorCode,
      errorData
    );
  }

  return response.json();
}

// ============ Query Params Builder ============

function buildQueryParams(filters: OrderFilters): string {
  const params = new URLSearchParams();
  
  if (filters.status) params.append('status', filters.status);
  if (filters.stage) params.append('stage', filters.stage);
  if (filters.q) params.append('q', filters.q);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  if (filters.sort) params.append('sort', filters.sort);
  
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// ============ Orders API ============

export async function fetchOrders(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
  const queryString = buildQueryParams(filters);
  const rawResponse = await apiClient<unknown>(`/orders${queryString}`);
  
  // Handle both array and paginated responses
  if (Array.isArray(rawResponse)) {
    const orders = rawResponse.map((raw) => normalizeOrder(raw as Record<string, unknown>));
    return {
      data: orders,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || orders.length,
        total: orders.length,
        totalPages: 1,
      },
    };
  }
  
  return normalizePaginatedOrders(rawResponse as Record<string, unknown>);
}

export async function fetchOrderById(id: string): Promise<Order> {
  const rawOrder = await apiClient<Record<string, unknown>>(`/orders/${id}`);
  return normalizeOrder(rawOrder);
}

/**
 * PATCH /orders/:id/status
 * 
 * Expected payload:
 * {
 *   stage: FulfillmentStage  // new, qc, pick, pack, label, shipped, issue
 * }
 * 
 * Backend may reject invalid transitions with 400/422 and error message.
 * Returns: Updated Order object
 */
export async function updateOrderStatus(
  orderId: string,
  stage: FulfillmentStage
): Promise<Order> {
  const rawOrder = await apiClient<Record<string, unknown>>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ stage }),
  });
  return normalizeOrder(rawOrder);
}

/**
 * POST /orders/:id/tracking
 * 
 * Expected payload:
 * {
 *   carrier: string       // Required: FedEx, UPS, DHL, etc.
 *   tracking: string      // Required: Tracking number
 *   service?: string      // Optional: Service type (e.g., "Express", "Ground")
 *   shippedAt?: string    // Optional: ISO timestamp (defaults to now on backend)
 *   orderStatus?: string  // Optional: WooCommerce status to set (from settings)
 * }
 * 
 * Returns: Updated Order object with shipment info populated
 */
export async function addOrderTracking(
  orderId: string,
  payload: TrackingPayload
): Promise<Order> {
  const shippedStatus = getShippedOrderStatus();
  
  const rawOrder = await apiClient<Record<string, unknown>>(`/orders/${orderId}/tracking`, {
    method: 'POST',
    body: JSON.stringify({
      carrier: payload.carrier,
      tracking: payload.tracking,
      service: payload.service,
      shippedAt: payload.shippedAt,
      orderStatus: shippedStatus,
    }),
  });
  return normalizeOrder(rawOrder);
}

export async function updateOrderNotes(
  orderId: string,
  notes: string
): Promise<Order> {
  const rawOrder = await apiClient<Record<string, unknown>>(`/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
  return normalizeOrder(rawOrder);
}

// ============ Metrics API ============

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return apiClient<DashboardMetrics>('/metrics');
}
