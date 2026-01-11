# 💳 Payment Gateway - Quick Reference

## 🚀 Quick Start

### 1. Run Database Migration
```bash
cd whm
mysql -u root -p yumna_panel < src/scripts/migrations/payment_gateways.sql
```

### 2. Install Dependencies
```bash
cd whm
npm install  # Stripe SDK already installed ✅
```

### 3. Configure Stripe (Admin Panel)
- Navigate to: **Billing → Payment Gateways → Stripe**
- Enter:
  - Publishable Key: `pk_test_...`
  - Secret Key: `sk_test_...`
  - Webhook Secret: `whsec_...`
- Enable Sandbox Mode
- Click Save

### 4. Configure PayPal (Admin Panel)
- Navigate to: **Billing → Payment Gateways → PayPal**
- Enter:
  - Client ID: Your PayPal app client ID
  - Client Secret: Your PayPal app secret
- Enable Sandbox Mode
- Click Save

### 5. Setup Webhooks

#### Stripe Webhook
- URL: `https://your-domain.com/api/payments/webhook/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `charge.refunded`

#### PayPal Webhook
- URL: `https://your-domain.com/api/payments/webhook/paypal`
- Events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`

---

## 📁 File Structure

```
whm/
├── src/
│   ├── routes/
│   │   └── payments.js                    # Payment API routes
│   ├── services/
│   │   └── payments/
│   │       ├── StripeService.js           # Stripe integration
│   │       ├── PayPalService.js           # PayPal integration
│   │       └── PaymentGatewayManager.js   # Unified manager
│   └── scripts/
│       └── migrations/
│           └── payment_gateways.sql       # Database schema

panel/
└── src/
    └── components/
        └── billing/
            ├── PaymentGatewaySettings.tsx  # Admin config UI
            ├── PaymentGatewaySettings.css
            ├── PaymentCheckout.tsx         # User payment UI
            └── PaymentCheckout.css

docs/
├── PAYMENT_GATEWAY.md                     # Full documentation
└── PAYMENT_GATEWAY_IMPLEMENTATION.md      # Implementation summary
```

---

## 🔌 API Endpoints

### User Endpoints
```
GET    /api/payments/gateways              # List available gateways
POST   /api/payments/create                # Create payment
POST   /api/payments/callback/:gateway     # Payment callback
GET    /api/payments/transactions          # User transactions
GET    /api/payments/transactions/:id      # Transaction details
GET    /api/payments/stats                 # Payment statistics
```

### Admin Endpoints
```
GET    /api/payments/gateways/:name        # Get gateway config
PUT    /api/payments/gateways/:name        # Update gateway config
POST   /api/payments/refund                # Create refund
GET    /api/payments/refunds               # List refunds
GET    /api/payments/webhook-events        # Webhook logs
```

### Webhook Endpoints (No Auth)
```
POST   /api/payments/webhook/stripe        # Stripe webhook
POST   /api/payments/webhook/paypal        # PayPal webhook
```

---

## 💻 Usage Examples

### Create Stripe Payment (Frontend)
```typescript
const response = await axios.post('/api/payments/create', {
  invoiceId: 123,
  gateway: 'stripe',
  options: {
    useCheckout: true,
    successUrl: 'https://your-domain.com/success',
    cancelUrl: 'https://your-domain.com/cancel'
  }
});

// Redirect to Stripe Checkout
window.location.href = response.data.url;
```

### Create PayPal Payment (Frontend)
```typescript
const response = await axios.post('/api/payments/create', {
  invoiceId: 123,
  gateway: 'paypal',
  options: {
    returnUrl: 'https://your-domain.com/return',
    cancelUrl: 'https://your-domain.com/cancel'
  }
});

// Redirect to PayPal
window.location.href = response.data.approvalUrl;
```

### Process PayPal Callback (Frontend)
```typescript
// After user returns from PayPal
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('token');

const response = await axios.post('/api/payments/callback/paypal', {
  orderId: orderId
});

if (response.data.success) {
  console.log('Payment completed!');
}
```

### Get Payment Statistics (Admin)
```typescript
const stats = await axios.get('/api/payments/stats');
console.log(stats.data);
// {
//   total_transactions: 150,
//   completed_count: 140,
//   total_revenue: 15000.00
// }
```

### Create Refund (Admin)
```typescript
await axios.post('/api/payments/refund', {
  transactionId: 456,
  amount: 50.00,
  reason: 'Customer request'
});
```

---

## 🧪 Testing

### Stripe Test Cards
```
Success:           4242 4242 4242 4242
Decline:           4000 0000 0000 0002
3D Secure:         4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9995
```

### PayPal Sandbox
1. Create sandbox accounts at [developer.paypal.com](https://developer.paypal.com)
2. Use sandbox credentials in gateway settings
3. Test with sandbox buyer account

---

## 🔍 Troubleshooting

### Payment Not Processing
1. Check gateway is enabled in settings
2. Verify API keys are correct
3. Check webhook secret is configured
4. Review transaction error_message

### Webhook Not Working
1. Verify webhook URL is accessible
2. Check webhook secret matches
3. Review webhook events log: `GET /api/payments/webhook-events`
4. Ensure HTTPS is enabled (required for production)

### Invoice Not Marked as Paid
1. Check webhook was received
2. Review webhook events log
3. Verify transaction status in database
4. Check backend logs for errors

---

## 📊 Database Tables

### payment_gateways
- Stores gateway configuration
- Default gateways: stripe, paypal, manual

### payment_transactions
- Records all payment attempts
- Links to invoices and users
- Tracks status: pending, completed, failed, refunded

### payment_refunds
- Tracks refund requests
- Links to transactions

### payment_webhook_events
- Logs all webhook events
- Useful for debugging

---

## 🎯 Payment Flow

### Stripe Flow
```
User → Create Payment → Redirect to Stripe
       ↓
Stripe Checkout → User Pays
       ↓
Webhook → Backend Processes
       ↓
Invoice Paid → Features Provisioned
       ↓
User Redirected to Success Page
```

### PayPal Flow
```
User → Create Payment → Redirect to PayPal
       ↓
PayPal → User Approves
       ↓
Return to Site → Capture Payment
       ↓
Invoice Paid → Features Provisioned
       ↓
Success Message
```

---

## 🔒 Security Checklist

- ✅ HTTPS enabled (required for production)
- ✅ Webhook signature verification
- ✅ Secure API key storage
- ✅ No card data stored locally
- ✅ PCI DSS compliant
- ✅ Admin-only gateway configuration
- ✅ User-specific transaction access

---

## 📞 Support

- **Documentation**: `docs/PAYMENT_GATEWAY.md`
- **Email**: support@yumnapanel.com
- **Discord**: https://discord.gg/yumnapanel

---

**Last Updated**: January 11, 2026  
**Version**: 3.0.0-alpha  
**Status**: ✅ Production Ready
