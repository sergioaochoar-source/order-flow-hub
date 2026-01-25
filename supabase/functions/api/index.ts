import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

// Stage transition rules
const STAGE_ORDER = ["new", "qc", "pick", "pack", "label", "shipped"] as const;
type FulfillmentStage = typeof STAGE_ORDER[number] | "issue";

function getStageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
}

function isValidTransition(fromStage: string, toStage: string): { valid: boolean; message?: string } {
  // To shipped requires tracking endpoint
  if (toStage === "shipped") {
    return { valid: false, message: "Use tracking endpoint to mark as shipped" };
  }

  // From issue can go to any stage except shipped
  if (fromStage === "issue") {
    if (toStage === "shipped") {
      return { valid: false, message: "Cannot go directly from issue to shipped" };
    }
    return { valid: true };
  }

  // To issue is always allowed
  if (toStage === "issue") {
    return { valid: true };
  }

  // Normal flow: can only move forward one step or backward
  const fromIdx = getStageIndex(fromStage);
  const toIdx = getStageIndex(toStage);

  if (fromIdx === -1 || toIdx === -1) {
    return { valid: false, message: "Invalid stage" };
  }

  // Allow forward by 1 or any backward
  if (toIdx === fromIdx + 1 || toIdx < fromIdx) {
    return { valid: true };
  }

  return { valid: false, message: `Cannot skip stages: ${fromStage} → ${toStage}` };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const pathParts = path.split("/").filter(Boolean);

  // Create Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // GET /api/health
    if (path === "health" && req.method === "GET") {
      return new Response(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/metrics
    if (path === "metrics" && req.method === "GET") {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get all orders for calculations
      const { data: orders, error } = await supabase
        .from("orders")
        .select("total, fulfillment_stage, created_at");

      if (error) throw error;

      const metrics = {
        todaySales: orders?.filter(o => o.created_at >= todayStart).reduce((sum, o) => sum + Number(o.total), 0) || 0,
        weekSales: orders?.filter(o => o.created_at >= weekStart).reduce((sum, o) => sum + Number(o.total), 0) || 0,
        monthSales: orders?.filter(o => o.created_at >= monthStart).reduce((sum, o) => sum + Number(o.total), 0) || 0,
        pendingOrders: orders?.filter(o => o.fulfillment_stage === "new").length || 0,
        issueOrders: orders?.filter(o => o.fulfillment_stage === "issue").length || 0,
        readyToShip: orders?.filter(o => o.fulfillment_stage === "label").length || 0,
        totalOrders: orders?.length || 0,
        averageTicket: orders?.length ? orders.reduce((sum, o) => sum + Number(o.total), 0) / orders.length : 0,
      };

      return new Response(JSON.stringify(metrics), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/orders
    if (path === "orders" && req.method === "GET") {
      const status = url.searchParams.get("status");
      const stage = url.searchParams.get("stage");
      const q = url.searchParams.get("q");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const sort = url.searchParams.get("sort") || "-createdAt";

      let query = supabase.from("orders").select("*", { count: "exact" });

      // Filters
      if (status) query = query.eq("status", status);
      if (stage) query = query.eq("fulfillment_stage", stage);
      if (q) {
        query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%`);
      }

      // Sorting
      const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
      const sortAsc = !sort.startsWith("-");
      const dbField = sortField === "createdAt" ? "created_at" : sortField === "orderNumber" ? "order_number" : sortField;
      query = query.order(dbField, { ascending: sortAsc });

      // Pagination
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);

      const { data: orders, count, error } = await query;
      if (error) throw error;

      // Fetch items and shipments for each order
      const orderIds = orders?.map(o => o.id) || [];
      
      const [itemsResult, shipmentsResult, eventsResult] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", orderIds),
        supabase.from("shipments").select("*").in("order_id", orderIds),
        supabase.from("order_events").select("*").in("order_id", orderIds).order("created_at", { ascending: false }),
      ]);

      // Map orders with their items, shipments, and events
      const enrichedOrders = orders?.map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        fulfillmentStage: order.fulfillment_stage,
        customer: {
          id: order.id,
          name: order.customer_name || "",
          email: order.customer_email || "",
        },
        shippingAddress: order.shipping_address || {},
        billingAddress: order.billing_address,
        items: itemsResult.data?.filter(i => i.order_id === order.id).map(i => ({
          id: i.id,
          sku: i.sku || "",
          name: i.name,
          quantity: i.quantity,
          price: Number(i.price),
          imageUrl: i.image_url,
        })) || [],
        total: Number(order.total),
        currency: order.currency || "USD",
        shippingMethod: order.shipping_method || "",
        shipment: shipmentsResult.data?.find(s => s.order_id === order.id) ? {
          carrier: shipmentsResult.data.find(s => s.order_id === order.id)!.carrier,
          trackingNumber: shipmentsResult.data.find(s => s.order_id === order.id)!.tracking_number,
          service: shipmentsResult.data.find(s => s.order_id === order.id)!.service,
          shippedAt: shipmentsResult.data.find(s => s.order_id === order.id)!.shipped_at,
        } : undefined,
        notes: order.notes,
        events: eventsResult.data?.filter(e => e.order_id === order.id).map(e => ({
          id: e.id,
          timestamp: e.created_at,
          type: e.type,
          description: e.message,
          user: e.user_name,
        })) || [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        paidAt: order.paid_at,
      })) || [];

      return new Response(JSON.stringify({
        data: enrichedOrders,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /api/orders/:id
    if (pathParts[0] === "orders" && pathParts.length === 2 && req.method === "GET") {
      const orderId = pathParts[1];
      
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [itemsResult, shipmentResult, eventsResult] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", orderId),
        supabase.from("shipments").select("*").eq("order_id", orderId).maybeSingle(),
        supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      ]);

      const enrichedOrder = {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        fulfillmentStage: order.fulfillment_stage,
        customer: {
          id: order.id,
          name: order.customer_name || "",
          email: order.customer_email || "",
        },
        shippingAddress: order.shipping_address || {},
        billingAddress: order.billing_address,
        items: itemsResult.data?.map(i => ({
          id: i.id,
          sku: i.sku || "",
          name: i.name,
          quantity: i.quantity,
          price: Number(i.price),
          imageUrl: i.image_url,
        })) || [],
        total: Number(order.total),
        currency: order.currency || "USD",
        shippingMethod: order.shipping_method || "",
        shipment: shipmentResult.data ? {
          carrier: shipmentResult.data.carrier,
          trackingNumber: shipmentResult.data.tracking_number,
          service: shipmentResult.data.service,
          shippedAt: shipmentResult.data.shipped_at,
        } : undefined,
        notes: order.notes,
        events: eventsResult.data?.map(e => ({
          id: e.id,
          timestamp: e.created_at,
          type: e.type,
          description: e.message,
          user: e.user_name,
        })) || [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        paidAt: order.paid_at,
      };

      return new Response(JSON.stringify(enrichedOrder), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /api/orders/:id/status
    if (pathParts[0] === "orders" && pathParts[2] === "status" && req.method === "PATCH") {
      const orderId = pathParts[1];
      const body = await req.json();
      const { stage } = body;

      if (!stage) {
        return new Response(JSON.stringify({ error: "stage is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get current order
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("fulfillment_stage")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate transition
      const validation = isValidTransition(order.fulfillment_stage, stage);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.message }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update order
      const { error: updateError } = await supabase
        .from("orders")
        .update({ fulfillment_stage: stage })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Create event
      await supabase.from("order_events").insert({
        order_id: orderId,
        type: "fulfillment_change",
        message: `Stage changed from ${order.fulfillment_stage} to ${stage}`,
      });

      // Return updated order (simplified)
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      return new Response(JSON.stringify({
        id: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.status,
        fulfillmentStage: updatedOrder.fulfillment_stage,
        total: Number(updatedOrder.total),
        updatedAt: updatedOrder.updated_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /api/orders/:id/tracking
    if (pathParts[0] === "orders" && pathParts[2] === "tracking" && req.method === "POST") {
      const orderId = pathParts[1];
      const body = await req.json();
      const { carrier, tracking, service, shippedAt, orderStatus } = body;

      if (!carrier || !tracking) {
        return new Response(JSON.stringify({ error: "carrier and tracking are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check order exists
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("id, fulfillment_stage")
        .eq("id", orderId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert shipment
      const { error: shipmentError } = await supabase
        .from("shipments")
        .upsert({
          order_id: orderId,
          carrier,
          tracking_number: tracking,
          service: service || null,
          shipped_at: shippedAt || new Date().toISOString(),
        });

      if (shipmentError) throw shipmentError;

      // Update order stage and optionally status
      const updateData: Record<string, string> = { fulfillment_stage: "shipped" };
      if (orderStatus) {
        updateData.status = orderStatus;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Create event
      await supabase.from("order_events").insert({
        order_id: orderId,
        type: "tracking_added",
        message: `Tracking added: ${carrier} ${tracking}`,
        meta: { carrier, tracking, service },
      });

      // Return updated order
      const { data: updatedOrder } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      const { data: shipment } = await supabase
        .from("shipments")
        .select("*")
        .eq("order_id", orderId)
        .single();

      return new Response(JSON.stringify({
        id: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        status: updatedOrder.status,
        fulfillmentStage: updatedOrder.fulfillment_stage,
        total: Number(updatedOrder.total),
        shipment: {
          carrier: shipment.carrier,
          trackingNumber: shipment.tracking_number,
          service: shipment.service,
          shippedAt: shipment.shipped_at,
        },
        updatedAt: updatedOrder.updated_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /api/orders/:id/notes
    if (pathParts[0] === "orders" && pathParts[2] === "notes" && req.method === "PATCH") {
      const orderId = pathParts[1];
      const body = await req.json();
      const { notes } = body;

      const { error } = await supabase
        .from("orders")
        .update({ notes })
        .eq("id", orderId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: "Not found", path }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
