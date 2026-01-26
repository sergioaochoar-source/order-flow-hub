import { Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";

const app = new Hono().basePath("/send-email");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_API_URL = "https://api.resend.com/emails";

const FROM_EMAIL = "Peptium Lab <noreply@peptiumlab.com>";

// Brand colors
const BRAND_ORANGE = "#E85D1C";
const BRAND_DARK = "#1a1a1a";

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

// Email header with styled brand logo
function getEmailHeader(title: string) {
  return `
    <div style="background: ${BRAND_DARK}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
      <table align="center" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
        <tr>
          <td style="vertical-align: middle; padding-right: 10px;">
            <!-- DNA Icon using table cells -->
            <table cellpadding="0" cellspacing="0" style="width: 40px;">
              <tr><td style="font-size: 14px; color: ${BRAND_ORANGE}; text-align: center;">●</td></tr>
              <tr><td style="font-size: 18px; color: ${BRAND_ORANGE}; text-align: center; letter-spacing: -2px;">⧗</td></tr>
              <tr><td style="font-size: 14px; color: ${BRAND_ORANGE}; text-align: center;">●</td></tr>
            </table>
          </td>
          <td style="vertical-align: middle;">
            <span style="font-size: 28px; font-weight: 800; color: ${BRAND_ORANGE}; letter-spacing: 2px;">PEPTIUM</span>
          </td>
        </tr>
      </table>
      <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 400;">${title}</h1>
    </div>
  `;
}

// Email footer
function getEmailFooter() {
  return `
    <div style="background: ${BRAND_DARK}; padding: 25px; border-radius: 0 0 10px 10px; text-align: center;">
      <p style="color: #888; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Peptium Lab. All rights reserved.</p>
      <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">
        <a href="https://peptiumlab.com" style="color: ${BRAND_ORANGE}; text-decoration: none;">peptiumlab.com</a>
      </p>
    </div>
  `;
}

// Shipping confirmation email template (English)
function getShippingConfirmationEmail(orderNumber: string, customerName: string, carrier: string, trackingNumber: string, trackingUrl?: string) {
  const trackingLink = trackingUrl || getTrackingUrl(carrier, trackingNumber);
  
  return {
    subject: `📦 Your order #${orderNumber} has been shipped`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        ${getEmailHeader("Your order is on its way! 📦")}
        
        <div style="background: white; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${customerName || 'there'}</strong>,</p>
          
          <p>Great news! Your order <strong style="color: ${BRAND_ORANGE};">#${orderNumber}</strong> has been shipped.</p>
          
          <div style="background: #fafafa; border: 1px solid #e5e7eb; border-left: 4px solid ${BRAND_ORANGE}; border-radius: 0 8px 8px 0; padding: 20px; margin: 25px 0;">
            <h3 style="margin: 0 0 15px 0; color: ${BRAND_DARK}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Carrier:</td>
                <td style="padding: 10px 0; font-weight: 600; color: ${BRAND_DARK};">${carrier}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 14px; border-top: 1px solid #eee;">Tracking Number:</td>
                <td style="padding: 10px 0; font-weight: 600; color: ${BRAND_DARK}; border-top: 1px solid #eee; font-family: monospace;">${trackingNumber}</td>
              </tr>
            </table>
          </div>
          
          ${trackingLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingLink}" style="display: inline-block; background: ${BRAND_ORANGE}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(232, 93, 28, 0.3);">
              Track My Order →
            </a>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">If you have any questions about your order, feel free to contact us.</p>
          
          <p style="margin-top: 30px; margin-bottom: 0;">Thank you for your purchase!</p>
          <p style="color: ${BRAND_ORANGE}; font-weight: 600; margin-top: 5px;">The Peptium Lab Team</p>
        </div>
        
        ${getEmailFooter()}
      </body>
      </html>
    `,
  };
}

// Status update email template (English)
function getStatusUpdateEmail(orderNumber: string, customerName: string, newStatus: string, statusMessage: string) {
  const statusEmoji = getStatusEmoji(newStatus);
  const statusLabel = getStatusLabel(newStatus);
  const statusColor = getStatusColor(newStatus);
  
  return {
    subject: `${statusEmoji} Order #${orderNumber} Update`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        ${getEmailHeader(`Order Update ${statusEmoji}`)}
        
        <div style="background: white; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <p style="font-size: 16px; margin-top: 0;">Hi <strong>${customerName || 'there'}</strong>,</p>
          
          <p>Your order <strong style="color: ${BRAND_ORANGE};">#${orderNumber}</strong> has been updated.</p>
          
          <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Current Status</p>
            <div style="display: inline-block; background: ${statusColor}; color: white; padding: 10px 24px; border-radius: 50px; font-size: 16px; font-weight: 600;">
              ${statusEmoji} ${statusLabel}
            </div>
            ${statusMessage ? `<p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px;">${statusMessage}</p>` : ''}
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">If you have any questions about your order, feel free to contact us.</p>
          
          <p style="margin-top: 30px; margin-bottom: 0;">Thank you for your purchase!</p>
          <p style="color: ${BRAND_ORANGE}; font-weight: 600; margin-top: 5px;">The Peptium Lab Team</p>
        </div>
        
        ${getEmailFooter()}
      </body>
      </html>
    `,
  };
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'new': '#3b82f6',
    'qc': '#8b5cf6',
    'pick': '#f59e0b',
    'pack': '#06b6d4',
    'label': '#10b981',
    'shipped': BRAND_ORANGE,
    'issue': '#ef4444',
  };
  return colors[status.toLowerCase()] || BRAND_ORANGE;
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
    'new': 'New Order',
    'qc': 'Quality Control',
    'pick': 'Picking',
    'pack': 'Packing',
    'label': 'Ready to Ship',
    'shipped': 'Shipped',
    'issue': 'Needs Attention',
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