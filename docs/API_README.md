# Fulfillment Center API - Quick Reference

## Authentication

The API accepts **either or both** headers:

```
X-PEPTIUM-KEY: your-api-token
Authorization: Bearer your-api-token
```

Configure in Lovable: **Settings → API Token**

---

## Key Endpoints

### 1. Test Connection
```bash
GET /health

# Response
{ "ok": true, "version": "1.0.0", "time": "2026-01-25T10:30:00Z" }
```

### 2. List Orders (with filters)
```bash
GET /orders?stage=pick&page=1&limit=25&q=john@example.com

# Response
{
  "data": [{ "id": "ord_123", "orderNumber": "#1234", ... }],
  "page": 1,
  "limit": 25,
  "total": 47,
  "totalPages": 2
}
```

### 3. Update Fulfillment Stage
```bash
PATCH /orders/ord_123/status
Content-Type: application/json

{ "stage": "pack" }

# Response: Updated Order object
```

### 4. Add Tracking (Mark Shipped)
```bash
POST /orders/ord_123/tracking
Content-Type: application/json

{
  "carrier": "FedEx",
  "tracking": "794644790348",
  "service": "Ground",
  "orderStatus": "completed"
}

# Response: Order with shipment populated, stage = "shipped"
```

---

## Error Handling

Invalid transitions return **400 or 409** with a message the frontend displays:

```json
{
  "message": "Cannot move to shipped without tracking information",
  "code": "TRACKING_REQUIRED"
}
```

Supported error fields (frontend parses in order):
1. `message`
2. `error`
3. `detail`
4. `errors[]` (first item)

---

## Fulfillment Flow

```
new → qc → pick → pack → label → shipped
              ↓
           issue (can return to any prior stage)
```

**Rules enforced by frontend:**
- Cannot skip stages
- Cannot ship without tracking
- Issue blocks automatic flow until resolved

---

## WooCommerce Webhooks

Configure in WooCommerce → Settings → Advanced → Webhooks:

| Event | Endpoint |
|-------|----------|
| Order Created | `POST /webhooks/woocommerce/order-created` |
| Order Updated | `POST /webhooks/woocommerce/order-updated` |
| Order Paid | `POST /webhooks/woocommerce/order-paid` |

**Security:** Validate `X-WC-Webhook-Signature` header with your webhook secret.

---

## Full Spec

See `openapi.yaml` for complete schema definitions.

Import into Swagger UI, Postman, or any OpenAPI-compatible tool.
