# Payment Gateway Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (React)"
        A[Payment Checkout UI]
        B[Gateway Settings UI]
        C[Transaction History]
    end
    
    subgraph "WHM Backend (Node.js)"
        D[Payment API Routes]
        E[Payment Gateway Manager]
        F[Stripe Service]
        G[PayPal Service]
        H[Billing Service]
    end
    
    subgraph "External Services"
        I[Stripe API]
        J[PayPal API]
    end
    
    subgraph "Database (MySQL)"
        K[(payment_gateways)]
        L[(payment_transactions)]
        M[(billing_invoices)]
        N[(payment_webhook_events)]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    E --> F
    E --> G
    E --> H
    F --> I
    G --> J
    F --> K
    G --> K
    E --> L
    E --> M
    I -.Webhook.-> D
    J -.Webhook.-> D
    D --> N
```

## Stripe Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Stripe
    participant DB as Database
    
    U->>F: Click "Pay Invoice"
    F->>B: POST /api/payments/create
    B->>DB: Get Invoice Details
    DB-->>B: Invoice Data
    B->>S: Create Checkout Session
    S-->>B: Session URL
    B-->>F: Return Session URL
    F->>U: Redirect to Stripe
    U->>S: Complete Payment
    S->>B: Webhook: payment_intent.succeeded
    B->>DB: Update Transaction Status
    B->>DB: Mark Invoice as Paid
    B->>DB: Provision Features
    DB-->>B: Success
    B-->>S: Webhook Received
    S->>U: Redirect to Success URL
    U->>F: View Success Page
```

## PayPal Payment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant P as PayPal
    participant DB as Database
    
    U->>F: Click "Pay Invoice"
    F->>B: POST /api/payments/create
    B->>DB: Get Invoice Details
    DB-->>B: Invoice Data
    B->>P: Create Order
    P-->>B: Order ID & Approval URL
    B-->>F: Return Approval URL
    F->>U: Redirect to PayPal
    U->>P: Approve Payment
    P->>U: Redirect to Return URL
    U->>F: Return to Site
    F->>B: POST /api/payments/callback/paypal
    B->>P: Capture Order
    P-->>B: Capture Success
    B->>DB: Update Transaction Status
    B->>DB: Mark Invoice as Paid
    B->>DB: Provision Features
    DB-->>B: Success
    B-->>F: Payment Complete
    F->>U: Show Success Message
```

## Webhook Processing Flow

```mermaid
flowchart TD
    A[Webhook Received] --> B{Verify Signature}
    B -->|Invalid| C[Return 400 Error]
    B -->|Valid| D[Log Event to DB]
    D --> E{Event Type}
    
    E -->|payment_intent.succeeded| F[Update Transaction]
    E -->|checkout.session.completed| F
    E -->|PAYMENT.CAPTURE.COMPLETED| F
    
    E -->|payment_intent.failed| G[Mark as Failed]
    E -->|PAYMENT.CAPTURE.DENIED| G
    
    E -->|charge.refunded| H[Process Refund]
    E -->|PAYMENT.CAPTURE.REFUNDED| H
    
    F --> I[Update Invoice Status]
    I --> J[Get Product Features]
    J --> K[Update User Quotas]
    K --> L[Activate Order]
    L --> M[Return Success]
    
    G --> N[Log Error Message]
    N --> M
    
    H --> O[Create Refund Record]
    O --> P[Update Transaction Status]
    P --> M
```

## Database Schema Relationships

```mermaid
erDiagram
    payment_gateways ||--o{ payment_transactions : "processes"
    billing_invoices ||--o{ payment_transactions : "has"
    users ||--o{ payment_transactions : "makes"
    payment_transactions ||--o{ payment_refunds : "may have"
    payment_gateways ||--o{ payment_webhook_events : "receives"
    
    payment_gateways {
        int id PK
        string name UK
        string display_name
        boolean is_enabled
        boolean is_sandbox
        json config
        json supported_currencies
    }
    
    payment_transactions {
        int id PK
        int invoice_id FK
        int user_id FK
        string gateway
        string gateway_transaction_id
        decimal amount
        string currency
        enum status
        json metadata
        timestamp created_at
        timestamp completed_at
    }
    
    payment_refunds {
        int id PK
        int transaction_id FK
        string gateway_refund_id
        decimal amount
        string reason
        enum status
        int processed_by
        timestamp created_at
    }
    
    payment_webhook_events {
        int id PK
        string gateway
        string event_id
        string event_type
        json payload
        boolean processed
        timestamp created_at
    }
    
    billing_invoices {
        int id PK
        int user_id FK
        decimal amount
        decimal tax_amount
        decimal total_amount
        enum status
        timestamp paid_at
    }
    
    users {
        int id PK
        string username
        string email
        int max_websites
        int max_databases
    }
```

## Transaction State Machine

```mermaid
stateDiagram-v2
    [*] --> pending: Create Payment
    
    pending --> processing: Payment Initiated
    pending --> cancelled: User Cancels
    
    processing --> completed: Payment Success
    processing --> failed: Payment Failed
    
    completed --> refunded: Refund Issued
    
    failed --> [*]
    cancelled --> [*]
    refunded --> [*]
    
    note right of completed
        Invoice marked as paid
        Features provisioned
        Order activated
    end note
    
    note right of refunded
        Refund record created
        Invoice status updated
        Features may be revoked
    end note
```

## Component Architecture

```mermaid
graph LR
    subgraph "Admin Components"
        A1[PaymentGatewaySettings]
        A2[TransactionList]
        A3[RefundManager]
        A4[WebhookEventLog]
    end
    
    subgraph "User Components"
        U1[PaymentCheckout]
        U2[InvoiceList]
        U3[TransactionHistory]
    end
    
    subgraph "Shared Services"
        S1[PaymentAPI]
        S2[BillingAPI]
    end
    
    A1 --> S1
    A2 --> S1
    A3 --> S1
    A4 --> S1
    
    U1 --> S1
    U2 --> S2
    U3 --> S1
    
    S1 --> Backend
    S2 --> Backend
```

## Refund Processing Flow

```mermaid
flowchart TD
    A[Admin Initiates Refund] --> B[Select Transaction]
    B --> C{Transaction Status}
    C -->|Not Completed| D[Error: Can't Refund]
    C -->|Completed| E[Enter Amount & Reason]
    E --> F{Gateway Type}
    
    F -->|Stripe| G[Call Stripe Refund API]
    F -->|PayPal| H[Call PayPal Refund API]
    
    G --> I{Refund Success?}
    H --> I
    
    I -->|Yes| J[Create Refund Record]
    I -->|No| K[Return Error]
    
    J --> L[Update Transaction Status]
    L --> M[Log Admin Action]
    M --> N[Send Notification]
    N --> O[Complete]
    
    D --> P[End]
    K --> P
    O --> P
```

---

## Legend

- **Solid Lines**: Direct API calls
- **Dashed Lines**: Webhook/Async events
- **Rectangles**: Components/Services
- **Cylinders**: Database tables
- **Diamonds**: Decision points
- **Rounded Rectangles**: Processes

---

**Generated**: January 11, 2026  
**Version**: 3.0.0-alpha
