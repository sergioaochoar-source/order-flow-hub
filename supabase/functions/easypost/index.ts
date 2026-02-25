import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const EASYPOST_API_URL = 'https://api.easypost.com/v2';

// Helper to make authenticated requests to EasyPost
async function easypostFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = Deno.env.get('EASYPOST_API_KEY');
  if (!apiKey) {
    throw new Error('EasyPost API key not configured');
  }

  const auth = btoa(`${apiKey}:`);
  const response = await fetch(`${EASYPOST_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || JSON.stringify(data);
    throw new Error(errorMessage);
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('EASYPOST_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'EasyPost API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/easypost', '');

  try {
    // POST /rates - Get shipping rates by creating a shipment
    if (req.method === 'POST' && path === '/rates') {
      const body = await req.json();
      const { addressFrom, addressTo, parcel } = body;

      // Create addresses first
      const fromAddress = await easypostFetch('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          address: {
            name: addressFrom.name,
            street1: addressFrom.street1,
            street2: addressFrom.street2 || '',
            city: addressFrom.city,
            state: addressFrom.state,
            zip: addressFrom.zip,
            country: addressFrom.country || 'US',
            phone: addressFrom.phone || '',
            email: addressFrom.email || '',
          }
        }),
      });

      const toAddress = await easypostFetch('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          address: {
            name: addressTo.name,
            street1: addressTo.street1,
            street2: addressTo.street2 || '',
            city: addressTo.city,
            state: addressTo.state,
            zip: addressTo.zip,
            country: addressTo.country || 'US',
            phone: addressTo.phone || '',
            email: addressTo.email || '',
          }
        }),
      });

      // Create parcel
      const parcelData = await easypostFetch('/parcels', {
        method: 'POST',
        body: JSON.stringify({
          parcel: {
            length: parcel.length,
            width: parcel.width,
            height: parcel.height,
            weight: parcel.weight * 16, // Convert lb to oz for EasyPost
          }
        }),
      });

      // Create shipment to get rates
      const shipment = await easypostFetch('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          shipment: {
            from_address: { id: fromAddress.id },
            to_address: { id: toAddress.id },
            parcel: { id: parcelData.id },
          }
        }),
      });

      // Format rates for frontend
      const rates = (shipment.rates || []).map((rate: any) => ({
        id: rate.id,
        carrier: rate.carrier,
        service: rate.service,
        rate: rate.rate,
        currency: rate.currency,
        delivery_days: rate.delivery_days,
        delivery_date: rate.delivery_date,
        delivery_date_guaranteed: rate.delivery_date_guaranteed,
        est_delivery_days: rate.est_delivery_days,
      }));

      // Sort by price
      rates.sort((a: any, b: any) => parseFloat(a.rate) - parseFloat(b.rate));

      return new Response(JSON.stringify({
        shipment: {
          id: shipment.id,
          from_address: shipment.from_address,
          to_address: shipment.to_address,
        },
        rates,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /labels - Purchase a shipping label
    if (req.method === 'POST' && path === '/labels') {
      const body = await req.json();
      const { shipmentId, rateId } = body;

      if (!shipmentId || !rateId) {
        return new Response(
          JSON.stringify({ error: 'shipmentId and rateId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buy the label
      const shipment = await easypostFetch(`/shipments/${shipmentId}/buy`, {
        method: 'POST',
        body: JSON.stringify({
          rate: { id: rateId },
        }),
      });

      return new Response(JSON.stringify({
        success: true,
        labelUrl: shipment.postage_label?.label_url,
        trackingNumber: shipment.tracking_code,
        carrier: shipment.selected_rate?.carrier,
        service: shipment.selected_rate?.service,
        trackingUrl: shipment.tracker?.public_url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /validate-address - Validate an address
    if (req.method === 'POST' && path === '/validate-address') {
      const body = await req.json();

      const address = await easypostFetch('/addresses/create_and_verify', {
        method: 'POST',
        body: JSON.stringify({
          address: {
            name: body.name,
            street1: body.street1,
            street2: body.street2 || '',
            city: body.city,
            state: body.state,
            zip: body.zip,
            country: body.country || 'US',
            phone: body.phone || '',
          }
        }),
      });

      return new Response(JSON.stringify({
        valid: true,
        address: {
          name: address.name,
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country,
        },
        verifications: address.verifications,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /tracking/:carrier/:trackingNumber - Track a shipment
    if (req.method === 'GET' && path.startsWith('/tracking/')) {
      const parts = path.split('/');
      const carrier = parts[2];
      const trackingNumber = parts[3];

      const tracker = await easypostFetch('/trackers', {
        method: 'POST',
        body: JSON.stringify({
          tracker: {
            tracking_code: trackingNumber,
            carrier: carrier,
          }
        }),
      });

      return new Response(JSON.stringify({
        status: tracker.status,
        status_detail: tracker.status_detail,
        carrier: tracker.carrier,
        tracking_code: tracker.tracking_code,
        public_url: tracker.public_url,
        est_delivery_date: tracker.est_delivery_date,
        tracking_details: tracker.tracking_details,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /label-pdf?url=... - Proxy download label PDF
    if (req.method === 'GET' && path === '/label-pdf') {
      const labelUrl = url.searchParams.get('url');
      
      if (!labelUrl) {
        return new Response(
          JSON.stringify({ error: 'url parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL is from EasyPost
      const allowedDomains = ['easypost.com', 'easypostfiles.com', 'easypost-files.s3.us-west-2.amazonaws.com'];
      const isAllowed = allowedDomains.some(domain => labelUrl.includes(domain));
      if (!isAllowed) {
        return new Response(
          JSON.stringify({ error: 'Invalid label URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the PDF
      const pdfResponse = await fetch(labelUrl);
      
      if (!pdfResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch label PDF' }),
          { status: pdfResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="shipping-label.pdf"',
        },
      });
    }

    // GET /carriers - List available carriers
    if (req.method === 'GET' && path === '/carriers') {
      const carriers = await easypostFetch('/carrier_accounts');
      
      return new Response(JSON.stringify(carriers), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not found', path }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('EasyPost API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
