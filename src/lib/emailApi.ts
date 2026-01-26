const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const EMAIL_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-email`;

interface SendShippingConfirmationParams {
  to: string;
  orderNumber: string;
  customerName?: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}

interface SendStatusUpdateParams {
  to: string;
  orderNumber: string;
  customerName?: string;
  newStatus: string;
  statusMessage?: string;
}

async function callEmailFunction(endpoint: string, data: object) {
  const response = await fetch(`${EMAIL_FUNCTION_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Email request failed with status ${response.status}`);
  }

  return response.json();
}

export async function sendShippingConfirmation(params: SendShippingConfirmationParams) {
  return callEmailFunction('/shipping-confirmation', params);
}

export async function sendStatusUpdate(params: SendStatusUpdateParams) {
  return callEmailFunction('/status-update', params);
}

export async function checkEmailHealth() {
  const response = await fetch(`${EMAIL_FUNCTION_URL}/health`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  return response.json();
}
