import { Order, FulfillmentStatus, DashboardMetrics } from '@/types/order';

const API_BASE_URL_KEY = 'fulfillment_api_base_url';

// Get API Base URL from localStorage
export function getApiBaseUrl(): string {
  return localStorage.getItem(API_BASE_URL_KEY) || '';
}

// Set API Base URL in localStorage
export function setApiBaseUrl(url: string): void {
  localStorage.setItem(API_BASE_URL_KEY, url);
}

// Check if API is configured
export function isApiConfigured(): boolean {
  const url = getApiBaseUrl();
  return url.length > 0;
}

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Central fetch client
async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  
  if (!baseUrl) {
    throw new ApiError('API Base URL not configured. Please set it in Settings.');
  }

  const url = `${baseUrl}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new ApiError(
      `API Error: ${response.statusText}`,
      response.status,
      response.statusText
    );
  }

  return response.json();
}

// ============ Orders API ============

export async function fetchOrders(): Promise<Order[]> {
  return apiClient<Order[]>('/orders');
}

export async function fetchOrderById(id: string): Promise<Order> {
  return apiClient<Order>(`/orders/${id}`);
}

export async function updateOrderStatus(
  orderId: string,
  status: FulfillmentStatus
): Promise<Order> {
  return apiClient<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function addOrderTracking(
  orderId: string,
  carrier: string,
  trackingNumber: string
): Promise<Order> {
  return apiClient<Order>(`/orders/${orderId}/tracking`, {
    method: 'POST',
    body: JSON.stringify({ carrier, trackingNumber }),
  });
}

export async function updateOrderNotes(
  orderId: string,
  notes: string
): Promise<Order> {
  return apiClient<Order>(`/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

// ============ Metrics API ============

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return apiClient<DashboardMetrics>('/metrics');
}
