# 💳 Payment Gateway Integration Guide

## Overview

Yumna Panel v3.0 includes comprehensive payment gateway integration supporting multiple payment providers including Stripe, PayPal, and manual payment methods. This guide covers setup, configuration, and usage.

## Supported Payment Gateways

### 1. **Stripe** 
- Credit/Debit Card payments
- Payment Intents API
- Checkout Sessions
- Webhook support
- Automatic refunds

### 2. **PayPal**
- PayPal account payments
- REST API v2
- Order creation and capture
- Webhook support
- Refund management

### 3. **Manual Payment**
- Bank transfer instructions
- Custom payment methods
- Manual verification

---

## Database Schema

The payment system uses the following tables:

### `payment_gateways`
Stores configuration for each payment gateway.

```sql
CREATE TABLE payment_gateways (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    is_sandbox BOOLEAN DEFAULT TRUE,
    config JSON,
    supported_currencies JSON,
    webhook_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### `payment_transactions`
Records all payment transactions.

```sql
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    user_id INT NOT NULL,
    gateway VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'),
    payment_method VARCHAR(50),
    metadata JSON,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL
);
```

### `payment_refunds`
Tracks refund requests and status.

### `payment_webhook_events`
Logs all webhook events from payment gateways.

---

## Installation

### 1. Run Database Migration

```bash
cd whm
mysql -u root -p yumna_panel < src/scripts/migrations/payment_gateways.sql
```

### 2. Install Dependencies

```bash
cd whm
npm install stripe
```

### 3. Restart WHM Server

```bash
npm run dev
```

---

## Configuration

### Stripe Setup

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Sign up for an account
   - Get your API keys from Dashboard → Developers → API keys

2. **Configure in Yumna Panel**
   - Navigate to **Billing → Payment Gateways**
   - Select **Stripe**
   - Enter your credentials:
     - Publishable Key: `pk_test_...` (or `pk_live_...` for production)
     - Secret Key: `sk_test_...` (or `sk_live_...` for production)
     - Webhook Secret: `whsec_...`
   - Toggle **Sandbox Mode** for testing
   - Enable the gateway

3. **Setup Webhook**
   - In Stripe Dashboard, go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/payments/webhook/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
     - `charge.refunded`
   - Copy the webhook signing secret to Yumna Panel

### PayPal Setup

1. **Create PayPal Developer Account**
   - Go to [developer.paypal.com](https://developer.paypal.com)
   - Create a REST API app
   - Get your Client ID and Secret

2. **Configure in Yumna Panel**
   - Navigate to **Billing → Payment Gateways**
   - Select **PayPal**
   - Enter your credentials:
     - Client ID: Your PayPal app client ID
     - Client Secret: Your PayPal app secret
     - Webhook ID (optional): For webhook verification
   - Toggle **Sandbox Mode** for testing
   - Enable the gateway

3. **Setup Webhook (Optional)**
   - In PayPal Developer Dashboard, configure webhook
   - Add endpoint: `https://your-domain.com/api/payments/webhook/paypal`
   - Select events:
     - `CHECKOUT.ORDER.APPROVED`
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`

### Manual Payment Setup

1. **Configure Bank Details**
   - Navigate to **Billing → Payment Gateways**
   - Select **Manual Payment**
   - Enter your bank information:
     - Bank Name
     - Account Number
     - Account Holder Name
     - Payment Instructions
   - Enable the gateway

---

## API Endpoints

### Gateway Management (Admin Only)

#### Get Available Gateways
```http
GET /api/payments/gateways
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "stripe",
    "display_name": "Stripe",
    "is_enabled": true,
    "is_sandbox": false,
    "supported_currencies": ["USD", "EUR", "GBP"]
  }
]
```

#### Get Gateway Configuration
```http
GET /api/payments/gateways/:name
Authorization: Bearer {admin_token}
```

#### Update Gateway Configuration
```http
PUT /api/payments/gateways/:name
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "is_enabled": true,
  "is_sandbox": false,
  "settings": {
    "publishable_key": "pk_live_...",
    "secret_key": "sk_live_...",
    "webhook_secret": "whsec_..."
  }
}
```

### Payment Processing

#### Create Payment
```http
POST /api/payments/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": 123,
  "gateway": "stripe",
  "options": {
    "useCheckout": true,
    "successUrl": "https://your-domain.com/success",
    "cancelUrl": "https://your-domain.com/cancel"
  }
}
```

**Response (Stripe Checkout):**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_...",
  "transactionId": 456
}
```

**Response (PayPal):**
```json
{
  "success": true,
  "orderId": "7YH12345AB123456C",
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=...",
  "transactionId": 457
}
```

#### Process Payment Callback
```http
POST /api/payments/callback/:gateway
Authorization: Bearer {token}
Content-Type: application/json

{
  "orderId": "7YH12345AB123456C"
}
```

#### Handle Webhook (No Auth Required)
```http
POST /api/payments/webhook/:gateway
Content-Type: application/json
Stripe-Signature: {signature}

{
  "id": "evt_...",
  "type": "payment_intent.succeeded",
  "data": { ... }
}
```

### Transaction Management

#### Get User Transactions
```http
GET /api/payments/transactions?limit=50
Authorization: Bearer {token}
```

#### Get All Transactions (Admin)
```http
GET /api/payments/transactions?gateway=stripe&status=completed
Authorization: Bearer {admin_token}
```

#### Get Transaction Details
```http
GET /api/payments/transactions/:id
Authorization: Bearer {token}
```

#### Get Payment Statistics
```http
GET /api/payments/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_transactions": 150,
  "completed_count": 140,
  "failed_count": 8,
  "refunded_count": 2,
  "total_revenue": 15000.00,
  "total_refunded": 200.00
}
```

### Refund Management (Admin Only)

#### Create Refund
```http
POST /api/payments/refund
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "transactionId": 456,
  "amount": 50.00,
  "reason": "Customer request"
}
```

#### Get All Refunds
```http
GET /api/payments/refunds
Authorization: Bearer {admin_token}
```

---

## Frontend Components

### PaymentGatewaySettings (Admin)

Component for configuring payment gateways.

```tsx
import PaymentGatewaySettings from '@/components/billing/PaymentGatewaySettings';

<PaymentGatewaySettings />
```

### PaymentCheckout (User)

Component for processing invoice payments.

```tsx
import PaymentCheckout from '@/components/billing/PaymentCheckout';

<PaymentCheckout 
  invoiceId={123}
  onSuccess={() => console.log('Payment successful')}
  onCancel={() => console.log('Payment cancelled')}
/>
```

---

## Payment Flow

### 1. User Flow (Stripe Checkout)

```
User clicks "Pay Invoice"
    ↓
Frontend calls POST /api/payments/create
    ↓
Backend creates Stripe Checkout Session
    ↓
User redirected to Stripe Checkout
    ↓
User completes payment
    ↓
Stripe sends webhook to /api/payments/webhook/stripe
    ↓
Backend processes webhook:
  - Updates transaction status
  - Marks invoice as paid
  - Provisions features
    ↓
User redirected to success page
```

### 2. User Flow (PayPal)

```
User clicks "Pay Invoice"
    ↓
Frontend calls POST /api/payments/create
    ↓
Backend creates PayPal Order
    ↓
User redirected to PayPal
    ↓
User approves payment
    ↓
User redirected back to site
    ↓
Frontend calls POST /api/payments/callback/paypal
    ↓
Backend captures PayPal order:
  - Updates transaction status
  - Marks invoice as paid
  - Provisions features
    ↓
User sees success message
```

---

## Testing

### Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date and any 3-digit CVC.

### PayPal Sandbox

1. Create sandbox accounts at [developer.paypal.com](https://developer.paypal.com)
2. Use sandbox credentials in Yumna Panel
3. Test with sandbox buyer account

---

## Webhook Security

### Stripe

Stripe webhooks are verified using the `Stripe-Signature` header:

```javascript
const event = stripe.webhooks.constructEvent(
  payload,
  signature,
  webhookSecret
);
```

### PayPal

PayPal webhooks can be verified using the Webhook ID (optional but recommended).

---

## Error Handling

### Common Errors

1. **"Gateway not configured"**
   - Solution: Enable and configure the gateway in settings

2. **"Invalid webhook signature"**
   - Solution: Verify webhook secret is correct

3. **"Payment failed"**
   - Check transaction error_message field
   - Review gateway dashboard for details

4. **"Invoice already paid"**
   - Invoice status is already 'paid'
   - No action needed

---

## Production Checklist

- [ ] Switch from sandbox to live mode
- [ ] Update API keys to production keys
- [ ] Configure production webhooks
- [ ] Test with real payment (small amount)
- [ ] Monitor webhook events log
- [ ] Set up error alerting
- [ ] Review refund policy
- [ ] Enable SSL/HTTPS
- [ ] Test payment flow end-to-end

---

## Support

For issues or questions:
- Check webhook events log: `/api/payments/webhook-events`
- Review transaction details: `/api/payments/transactions/:id`
- Check gateway dashboard (Stripe/PayPal)
- Contact support: support@yumnapanel.com

---

**Last Updated**: January 11, 2026  
**Version**: 3.0.0-alpha
