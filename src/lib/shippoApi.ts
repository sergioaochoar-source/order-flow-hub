// Shippo API client for shipping labels

const getApiBaseUrl = () => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gmekftctjsytojbdobem';
  return `https://${projectId}.supabase.co/functions/v1/shippo`;
};

interface ShippoAddress {
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

interface ShippoParcel {
  length: number;
  width: number;
  height: number;
  distance_unit: 'in' | 'cm';
  weight: number;
  mass_unit: 'lb' | 'kg' | 'oz' | 'g';
}

interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel: {
    name: string;
    token: string;
  };
  amount: string;
  currency: string;
  estimated_days: number;
  duration_terms: string;
}

interface ShippoTransaction {
  object_id: string;
  status: string;
  label_url: string;
  tracking_number: string;
  tracking_url_provider: string;
  rate: ShippoRate;
}

export interface GetRatesParams {
  addressFrom: ShippoAddress;
  addressTo: ShippoAddress;
  parcels: ShippoParcel[];
}

export interface GetRatesResponse {
  shipment: any;
  rates: ShippoRate[];
}

export interface PurchaseLabelResponse {
  success: boolean;
  transaction: ShippoTransaction;
  labelUrl: string;
  trackingNumber: string;
  carrier: string;
}

async function shippoFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  return shippoFetch('/carriers');
}

// Get shipping rates for a shipment
export async function getRates(params: GetRatesParams): Promise<GetRatesResponse> {
  return shippoFetch('/rates', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// Purchase a shipping label
export async function purchaseLabel(rateId: string): Promise<PurchaseLabelResponse> {
  return shippoFetch('/labels', {
    method: 'POST',
    body: JSON.stringify({ rateId }),
  });
}

// Validate an address
export async function validateAddress(address: ShippoAddress): Promise<any> {
  return shippoFetch('/validate-address', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

// Track a shipment
export async function trackShipment(carrier: string, trackingNumber: string): Promise<any> {
  return shippoFetch(`/tracking/${carrier}/${trackingNumber}`);
}

// Download label PDF via proxy (avoids browser blocking Shippo CDN)
export function getLabelPdfProxyUrl(labelUrl: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'gmekftctjsytojbdobem';
  const encodedUrl = encodeURIComponent(labelUrl);
  return `https://${projectId}.supabase.co/functions/v1/shippo/label-pdf?url=${encodedUrl}`;
}

// Helper to convert order address to Shippo format
export function orderAddressToShippo(address: any, customerName?: string, customerEmail?: string): ShippoAddress {
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
export const DEFAULT_PARCEL: ShippoParcel = {
  length: 10,
  width: 8,
  height: 4,
  distance_unit: 'in',
  weight: 1,
  mass_unit: 'lb',
};
