import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SHIPPO_API_URL = 'https://api.goshippo.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const shippoApiKey = Deno.env.get('SHIPPO_API_KEY');
  if (!shippoApiKey) {
    return new Response(
      JSON.stringify({ error: 'Shippo API key not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/shippo', '');

  try {
    // GET /carriers - List available carrier accounts
    if (req.method === 'GET' && path === '/carriers') {
      const response = await fetch(`${SHIPPO_API_URL}/carrier_accounts`, {
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /rates - Get shipping rates
    if (req.method === 'POST' && path === '/rates') {
      const body = await req.json();
      const { addressFrom, addressTo, parcels } = body;

      // Create shipment to get rates
      const shipmentResponse = await fetch(`${SHIPPO_API_URL}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address_from: addressFrom,
          address_to: addressTo,
          parcels: parcels,
          async: false,
        }),
      });

      const shipmentData = await shipmentResponse.json();
      
      if (!shipmentResponse.ok) {
        return new Response(JSON.stringify({ error: shipmentData }), {
          status: shipmentResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        shipment: shipmentData,
        rates: shipmentData.rates || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /labels - Purchase a shipping label
    if (req.method === 'POST' && path === '/labels') {
      const body = await req.json();
      const { rateId } = body;

      if (!rateId) {
        return new Response(
          JSON.stringify({ error: 'rateId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create transaction (purchase label)
      const transactionResponse = await fetch(`${SHIPPO_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate: rateId,
          label_file_type: 'PDF',
          async: false,
        }),
      });

      const transactionData = await transactionResponse.json();

      if (!transactionResponse.ok || transactionData.status === 'ERROR') {
        return new Response(JSON.stringify({ 
          error: transactionData.messages || transactionData 
        }), {
          status: transactionResponse.ok ? 400 : transactionResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        transaction: transactionData,
        labelUrl: transactionData.label_url,
        trackingNumber: transactionData.tracking_number,
        carrier: transactionData.rate?.provider || 'Unknown',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /validate-address - Validate an address
    if (req.method === 'POST' && path === '/validate-address') {
      const body = await req.json();
      
      const response = await fetch(`${SHIPPO_API_URL}/addresses`, {
        method: 'POST',
        headers: {
          'Authorization': `ShippoToken ${shippoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...body,
          validate: true,
        }),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /tracking/:carrier/:trackingNumber - Track a shipment
    if (req.method === 'GET' && path.startsWith('/tracking/')) {
      const parts = path.split('/');
      const carrier = parts[2];
      const trackingNumber = parts[3];

      const response = await fetch(
        `${SHIPPO_API_URL}/tracks/${carrier}/${trackingNumber}`,
        {
          headers: {
            'Authorization': `ShippoToken ${shippoApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /label-pdf?url=... - Proxy download label PDF to avoid browser blocking
    if (req.method === 'GET' && path === '/label-pdf') {
      const labelUrl = url.searchParams.get('url');
      
      if (!labelUrl) {
        return new Response(
          JSON.stringify({ error: 'url parameter is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate URL is from Shippo
      if (!labelUrl.includes('goshippo.com')) {
        return new Response(
          JSON.stringify({ error: 'Invalid label URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the PDF from Shippo
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

    return new Response(
      JSON.stringify({ error: 'Not found', path }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Shippo API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
