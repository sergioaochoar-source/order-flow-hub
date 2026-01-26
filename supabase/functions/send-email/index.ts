import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const app = new Hono().basePath("/send-email");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_API_URL = "https://api.resend.com/emails";

const FROM_EMAIL = "Peptium Lab <noreply@peptiumlab.com>";

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Resend API error: ${response.status}`);
  }

  return response.json();
}

// Shipping confirmation email template
function getShippingConfirmationEmail(orderNumber: string, customerName: string, carrier: string, trackingNumber: string, trackingUrl?: string) {
  const trackingLink = trackingUrl || getTrackingUrl(carrier, trackingNumber);
  
  return {
    subject: `📦 Tu pedido #${orderNumber} ha sido enviado`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">¡Tu pedido está en camino! 📦</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Hola <strong>${customerName || 'Cliente'}</strong>,</p>
          
          <p>Nos complace informarte que tu pedido <strong>#${orderNumber}</strong> ha sido enviado.</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #374151;">Información del envío</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Transportista:</td>
                <td style="padding: 8px 0; font-weight: 600;">${carrier}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Número de rastreo:</td>
                <td style="padding: 8px 0; font-weight: 600;">${trackingNumber}</td>
              </tr>
            </table>
          </div>
          
          ${trackingLink ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${trackingLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Rastrear mi pedido
            </a>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px;">Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
          
          <p style="margin-top: 30px;">¡Gracias por tu compra!</p>
          <p style="color: #6b7280;">El equipo de Peptium Lab</p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Peptium Lab. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
  };
}

// Status update email template
function getStatusUpdateEmail(orderNumber: string, customerName: string, newStatus: string, statusMessage: string) {
  const statusEmoji = getStatusEmoji(newStatus);
  const statusLabel = getStatusLabel(newStatus);
  
  return {
    subject: `${statusEmoji} Actualización de tu pedido #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Actualización de pedido ${statusEmoji}</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Hola <strong>${customerName || 'Cliente'}</strong>,</p>
          
          <p>Tu pedido <strong>#${orderNumber}</strong> ha sido actualizado.</p>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0;">Estado actual:</p>
            <p style="font-size: 24px; font-weight: 700; color: #374151; margin: 0;">${statusEmoji} ${statusLabel}</p>
            ${statusMessage ? `<p style="color: #6b7280; margin: 15px 0 0 0;">${statusMessage}</p>` : ''}
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
          
          <p style="margin-top: 30px;">¡Gracias por tu compra!</p>
          <p style="color: #6b7280;">El equipo de Peptium Lab</p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Peptium Lab. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
  };
}

function getTrackingUrl(carrier: string, trackingNumber: string): string {
  const carrierLower = carrier.toLowerCase();
  
  if (carrierLower.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  } else if (carrierLower.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  } else if (carrierLower.includes('usps')) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  } else if (carrierLower.includes('dhl')) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  } else if (carrierLower.includes('estafeta')) {
    return `https://www.estafeta.com/Rastreo/${trackingNumber}`;
  } else if (carrierLower.includes('paquetexpress') || carrierLower.includes('paquete express')) {
    return `https://www.paquetexpress.com.mx/rastreo/${trackingNumber}`;
  }
  
  return '';
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    'new': '🆕',
    'qc': '🔍',
    'pick': '📋',
    'pack': '📦',
    'label': '🏷️',
    'shipped': '🚚',
    'issue': '⚠️',
  };
  return emojis[status.toLowerCase()] || '📬';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'new': 'Nuevo',
    'qc': 'Control de Calidad',
    'pick': 'En Preparación',
    'pack': 'Empacando',
    'label': 'Etiquetado',
    'shipped': 'Enviado',
    'issue': 'Requiere Atención',
  };
  return labels[status.toLowerCase()] || status;
}

// Handle preflight
app.options("*", (c) => {
  return c.json({}, 200, corsHeaders);
});

// Send shipping confirmation email
app.post("/shipping-confirmation", async (c) => {
  try {
    const body = await c.req.json();
    const { to, orderNumber, customerName, carrier, trackingNumber, trackingUrl } = body;

    if (!to || !orderNumber || !carrier || !trackingNumber) {
      return c.json({ error: "Missing required fields: to, orderNumber, carrier, trackingNumber" }, 400, corsHeaders);
    }

    const emailContent = getShippingConfirmationEmail(orderNumber, customerName, carrier, trackingNumber, trackingUrl);

    const result = await sendEmail(to, emailContent.subject, emailContent.html);

    console.log(`[Email] Shipping confirmation sent to ${to} for order #${orderNumber}`, result);

    return c.json({ success: true, id: result.id }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("[Email] Error sending shipping confirmation:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500, corsHeaders);
  }
});

// Send status update email
app.post("/status-update", async (c) => {
  try {
    const body = await c.req.json();
    const { to, orderNumber, customerName, newStatus, statusMessage } = body;

    if (!to || !orderNumber || !newStatus) {
      return c.json({ error: "Missing required fields: to, orderNumber, newStatus" }, 400, corsHeaders);
    }

    const emailContent = getStatusUpdateEmail(orderNumber, customerName, newStatus, statusMessage || '');

    const result = await sendEmail(to, emailContent.subject, emailContent.html);

    console.log(`[Email] Status update sent to ${to} for order #${orderNumber} - Status: ${newStatus}`, result);

    return c.json({ success: true, id: result.id }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("[Email] Error sending status update:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ error: message }, 500, corsHeaders);
  }
});

// Health check
app.get("/health", (c) => {
  return c.json({ ok: true, service: "email" }, 200, corsHeaders);
});

Deno.serve(app.fetch);
