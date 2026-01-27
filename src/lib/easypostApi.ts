// EasyPost API client for shipping labels

const getApiBaseUrl = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gmekftctjsytojbdobem';
  return `https://${projectId}.supabase.co/functions/v1/easypost`;
};

export interface EasyPostAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface EasyPostParcel {
  length: number;
  width: number;
  height: number;
  weight: number; // in lb
}

export interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
  delivery_days: number | null;
  delivery_date: string | null;
  delivery_date_guaranteed: boolean;
  est_delivery_days: number | null;
}

export interface GetRatesParams {
  addressFrom: EasyPostAddress;
  addressTo: EasyPostAddress;
  parcel: EasyPostParcel;
}

export interface GetRatesResponse {
  shipment: {
    id: string;
    from_address: any;
    to_address: any;
  };
  rates: EasyPostRate[];
}

export interface PurchaseLabelResponse {
  success: boolean;
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
  service: string;
  trackingUrl?: string;
}

async function easypostFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `Request failed: ${response.status}`);
  }

  return data;
}

// Get available carrier accounts
export async function getCarriers(): Promise<any> {
  return easypostFetch('/carriers');
}

// Get shipping rates for a shipment
export async function getRates(params: GetRatesParams): Promise<GetRatesResponse> {
  return easypostFetch('/rates', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Purchase a shipping label
export async function purchaseLabel(shipmentId: string, rateId: string): Promise<PurchaseLabelResponse> {
  return easypostFetch('/labels', {
    method: 'POST',
    body: JSON.stringify({ shipmentId, rateId }),
  });
}

// Validate an address
export async function validateAddress(address: EasyPostAddress): Promise<any> {
  return easypostFetch('/validate-address', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

// Track a shipment
export async function trackShipment(carrier: string, trackingNumber: string): Promise<any> {
  return easypostFetch(`/tracking/${carrier}/${trackingNumber}`);
}

// Download label PDF via proxy
export function getLabelPdfProxyUrl(labelUrl: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gmekftctjsytojbdobem';
  const encodedUrl = encodeURIComponent(labelUrl);
  return `https://${projectId}.supabase.co/functions/v1/easypost/label-pdf?url=${encodedUrl}`;
}

// Helper to convert order address to EasyPost format
export function orderAddressToEasyPost(address: any, customerName?: string, customerEmail?: string): EasyPostAddress {
  return {
    name: address?.name || customerName || '',
    street1: address?.address_1 || address?.street1 || '',
    street2: address?.address_2 || address?.street2 || '',
    city: address?.city || '',
    state: address?.state || '',
    zip: address?.postcode || address?.zip || '',
    country: address?.country || 'US',
    phone: address?.phone || '',
    email: customerEmail || address?.email || '',
  };
}

// Default parcel for standard shipments
export const DEFAULT_PARCEL: EasyPostParcel = {
  length: 10,
  width: 8,
  height: 4,
  weight: 1, // lb
};
