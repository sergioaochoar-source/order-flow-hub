import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Brand constants (same as send-email)
const BRAND_ORANGE = "#E85D1C";
const BRAND_DARK = "#1a1a1a";
const LOGO_URL = "https://peptiumlab.com/assets/peptium-logo-dark-Cqi2XtN2.png";
const FROM_EMAIL = "Peptium Lab <noreply@peptiumlab.com>";
const RESEND_API_URL = "https://api.resend.com/emails";

// Map EasyPost statuses to human-readable labels
const STATUS_LABELS: Record<string, string> = {
  unknown: "Unknown",
  pre_transit: "Pre-Transit",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  available_for_pickup: "Available for Pickup",
  return_to_sender: "Returned to Sender",
  failure: "Delivery Failed",
  cancelled: "Cancelled",
  error: "Error",
};

const STATUS_EMOJIS: Record<string, string> = {
  pre_transit: "📋",
  in_transit: "🚚",
  out_for_delivery: "🏃",
  delivered: "✅",
  available_for_pickup: "📬",
  return_to_sender: "↩️",
  failure: "❌",
  cancelled: "🚫",
  error: "⚠️",
};

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("[Webhook] RESEND_API_KEY not configured, skipping email");
    return null;
  }
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!response.ok) {
    const err = await response.json();
    console.error("[Webhook] Email send failed:", err);
    return null;
  }
  return response.json();
}

function getDeliveredEmail(orderNumber: string, customerName: string, carrier: string, trackingNumber: string) {
  return {
    subject: `✅ Your order #${orderNumber} has been delivered!`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: ${BRAND_DARK}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <img src="${LOGO_URL}" alt="Peptium Lab" style="height: 45px; margin-bottom: 20px;" />
    <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 400;">Your package has arrived! ✅</h1>
  </div>
  <div style="background: white; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-top: 0;">Hi <strong>${customerName || "there"}</strong>,</p>
    <p>Great news! Your order <strong style="color: ${BRAND_ORANGE};">#${orderNumber}</strong> has been delivered.</p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 25px; margin: 25px 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">📦✅</div>
      <p style="font-size: 18px; font-weight: 600; color: #166534; margin: 0;">Delivered</p>
      <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0 0;">${carrier} • ${trackingNumber}</p>
    </div>
    <p>We hope you love your purchase! If you have any questions or concerns, don't hesitate to reach out.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.trustpilot.com/review/peptiumlab.com" style="display: inline-block; background: ${BRAND_ORANGE}; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(232, 93, 28, 0.3);">
        ⭐ Leave a Review
      </a>
    </div>
    <p style="margin-top: 30px; margin-bottom: 0;">Thank you for choosing us!</p>
    <p style="color: ${BRAND_ORANGE}; font-weight: 600; margin-top: 5px;">The Peptium Lab Team</p>
  </div>
  <div style="background: ${BRAND_DARK}; padding: 25px; border-radius: 0 0 10px 10px; text-align: center;">
    <p style="color: #888; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Peptium Lab. All rights reserved.</p>
    <p style="color: #666; font-size: 11px; margin: 10px 0 0 0;">
      <a href="https://peptiumlab.com" style="color: ${BRAND_ORANGE}; text-decoration: none;">peptiumlab.com</a>
    </p>
  </div>
</body></html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    console.log("[Webhook] EasyPost event received:", JSON.stringify(payload).slice(0, 500));

    // EasyPost sends events with { description, mode, result, ... }
    const description = payload.description || "";
    const result = payload.result || {};

    // We only care about tracker events
    if (!description.startsWith("tracker.")) {
      console.log(`[Webhook] Ignoring non-tracker event: ${description}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingCode = result.tracking_code;
    const carrier = result.carrier || "";
    const status = result.status || "unknown"; // pre_transit, in_transit, out_for_delivery, delivered, etc.
    const trackingDetails = result.tracking_details || [];
    const estDelivery = result.est_delivery_date || null;

    if (!trackingCode) {
      console.warn("[Webhook] No tracking_code in event, skipping");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Webhook] Tracker update: ${trackingCode} → ${status} (${carrier})`);

    // Find matching shipment
    const { data: shipment, error: shipErr } = await supabase
      .from("shipments")
      .select("order_id, carrier, tracking_number")
      .eq("tracking_number", trackingCode)
      .maybeSingle();

    if (shipErr) {
      console.error("[Webhook] Error finding shipment:", shipErr);
      return new Response(JSON.stringify({ error: "DB error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!shipment) {
      console.warn(`[Webhook] No shipment found for tracking: ${trackingCode}`);
      return new Response(JSON.stringify({ ok: true, matched: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update shipment with tracking status
    const updateData: Record<string, unknown> = {
      tracking_status: status,
      tracking_details: trackingDetails,
      updated_at: new Date().toISOString(),
    };

    if (estDelivery) {
      updateData.estimated_delivery = estDelivery;
    }

    if (status === "delivered") {
      updateData.delivered_at = new Date().toISOString();
    }

    const { error: updateErr } = await supabase
      .from("shipments")
      .update(updateData)
      .eq("order_id", shipment.order_id);

    if (updateErr) {
      console.error("[Webhook] Error updating shipment:", updateErr);
    } else {
      console.log(`[Webhook] Updated shipment for order ${shipment.order_id}: ${status}`);
    }

    // If delivered, update order status and send email
    if (status === "delivered") {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", shipment.order_id);

      if (orderErr) {
        console.error("[Webhook] Error updating order status:", orderErr);
      }

      // Fetch order for email
      const { data: order } = await supabase
        .from("orders")
        .select("order_number, customer_name, customer_email")
        .eq("id", shipment.order_id)
        .single();

      if (order?.customer_email) {
        const email = getDeliveredEmail(
          order.order_number,
          order.customer_name || "",
          carrier,
          trackingCode
        );
        const emailResult = await sendEmail(order.customer_email, email.subject, email.html);
        if (emailResult) {
          console.log(`[Webhook] Delivery email sent to ${order.customer_email}`);
        }
      }

      // Log event
      await supabase.from("order_events").insert({
        order_id: shipment.order_id,
        type: "delivered",
        message: `Package delivered via ${carrier} (${trackingCode})`,
        meta: { status, carrier, tracking_code: trackingCode },
      });
    }

    // Log tracker update event
    if (status !== "delivered") {
      await supabase.from("order_events").insert({
        order_id: shipment.order_id,
        type: "tracking_update",
        message: `Tracking status: ${STATUS_LABELS[status] || status}`,
        meta: { status, carrier, tracking_code: trackingCode },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, status, order_id: shipment.order_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
