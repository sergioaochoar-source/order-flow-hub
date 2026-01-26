import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is called by a cron job to send follow-up review emails
// to customers 2 weeks after their order was paid

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find orders that:
    // 1. Were paid exactly 14 days ago (give or take a day for cron timing)
    // 2. Have been shipped (fulfillment_stage = 'shipped')
    // 3. Haven't received a follow-up email yet
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const startOfWindow = new Date(twoWeeksAgo);
    startOfWindow.setHours(0, 0, 0, 0);
    const endOfWindow = new Date(twoWeeksAgo);
    endOfWindow.setHours(23, 59, 59, 999);

    console.log(`[Follow-up Cron] Checking for orders paid between ${startOfWindow.toISOString()} and ${endOfWindow.toISOString()}`);

    // Get orders paid 14 days ago that have shipped
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, paid_at")
      .eq("fulfillment_stage", "shipped")
      .gte("paid_at", startOfWindow.toISOString())
      .lte("paid_at", endOfWindow.toISOString())
      .not("customer_email", "is", null);

    if (error) {
      console.error("[Follow-up Cron] Error fetching orders:", error);
      throw error;
    }

    console.log(`[Follow-up Cron] Found ${orders?.length || 0} orders to send follow-up emails`);

    let sentCount = 0;
    let errorCount = 0;

    for (const order of orders || []) {
      // Check if we already sent a follow-up email for this order
      const { data: existingEvent } = await supabase
        .from("order_events")
        .select("id")
        .eq("order_id", order.id)
        .eq("type", "followup_email_sent")
        .maybeSingle();

      if (existingEvent) {
        console.log(`[Follow-up Cron] Skipping order ${order.order_number} - already sent`);
        continue;
      }

      try {
        // Send the follow-up email
        const emailUrl = `${supabaseUrl}/functions/v1/send-email/follow-up-review`;
        const response = await fetch(emailUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: order.customer_email,
            orderNumber: order.order_number,
            customerName: order.customer_name,
          }),
        });

        if (response.ok) {
          // Record that we sent the email
          await supabase.from("order_events").insert({
            order_id: order.id,
            type: "followup_email_sent",
            message: "Follow-up review request email sent",
            meta: { to: order.customer_email },
          });

          sentCount++;
          console.log(`[Follow-up Cron] Sent follow-up email for order ${order.order_number} to ${order.customer_email}`);
        } else {
          const errorText = await response.text();
          console.error(`[Follow-up Cron] Failed to send email for order ${order.order_number}:`, errorText);
          errorCount++;
        }
      } catch (emailError) {
        console.error(`[Follow-up Cron] Error sending email for order ${order.order_number}:`, emailError);
        errorCount++;
      }
    }

    console.log(`[Follow-up Cron] Completed. Sent: ${sentCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        ordersProcessed: orders?.length || 0,
        emailsSent: sentCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[Follow-up Cron] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});