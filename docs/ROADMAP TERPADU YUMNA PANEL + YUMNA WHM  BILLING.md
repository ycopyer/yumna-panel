# 🧭 ROADMAP TERPADU YUMNA PANEL + YUMNA WHM + BILLING

Roadmap ini khusus memetakan **integrasi penuh antara Yumna Panel (User), Yumna WHM (Control/Admin), dan Billing System** dari nol sampai enterprise.

---

## STAGE 0 — VISI & POSISI PRODUK (MINGGU 0)

### Tujuan
Menentukan peran masing-masing komponen agar tidak tumpang tindih.

### Definisi Produk
- **Yumna Panel** → Client/User Area
- **Yumna WHM** → Admin & Server Control
- **Yumna Billing** → Order, Invoice, Payment, Usage

### Output
- Scope jelas
- Boundary API antar sistem

---

## STAGE 1 — CORE PLATFORM (BULAN 1)

### A. Struktur Folder (Referensi Implementasi)

```
yumna/
 ├── panel/           # Client Area
 │   ├── api/
 │   ├── ui/
 │   └── auth/
 ├── whm/             # Control Plane
 │   ├── api/
 │   ├── scheduler/
 │   ├── provisioning/
 │   └── audit/
 ├── agent/           # Server Agent
 │   ├── heartbeat/
 │   ├── executor/
 │   └── security/
 └── common/
     ├── auth/
     ├── events/
     └── utils/
```

### B. API Endpoint Awal (Minimal Viable)

#### Auth
- POST /api/auth/login
- POST /api/auth/logout

#### WHM
- POST /api/whm/servers/register
- GET  /api/whm/servers
- POST /api/whm/services/provision
- POST /api/whm/services/suspend

#### Panel
- GET /api/panel/services
- GET /api/panel/usage

---

### Diagram Arsitektur Final (Panel–WHM–Billing)

```
[ Client ] → [ Yumna Panel ] → [ Yumna WHM ] → [ Agent ] → [ Server ]
                              ↑
                         [ Billing ]
```

Prinsip:
- Panel tidak provisioning langsung
- Billing event-driven
- WHM sebagai single control plane

### Output
> Panel & WHM hidup tanpa billing

---

## STAGE 2 — MULTI-SERVER & SECURITY (BULAN 2)

### WHM
- Multi-node orchestration
- Agent non-root
- Audit log

### Panel
- Domain binding
- Resource quota display

### Output
> Siap hosting nyata

---

## STAGE 3 — COMMUNITY EDITION RELEASE (BULAN 3)

### Wireframe UI (Low-Fidelity)

#### Panel (Client Area)
```
+ Dashboard
  - Active Services
  - Usage Summary
+ Services
  - Detail / Restart
+ Billing
  - Invoice List
+ Profile
```

#### WHM (Admin)
```
+ Dashboard
  - Server Status
+ Servers
  - Add / Health
+ Services
  - Provision / Suspend
+ Audit Log
```

---

### Checklist Coding (STAGE 1–3)

#### Backend
- [ ] Auth & RBAC
- [ ] Server CRUD
- [ ] Agent heartbeat
- [ ] Provisioning API

#### Panel UI
- [ ] Login
- [ ] Dashboard service
- [ ] Usage view

#### WHM UI
- [ ] Server list
- [ ] Service control
- [ ] Audit log view

#### Infra
- [ ] Docker / systemd
- [ ] Reverse proxy

- [ ] Docker / systemd setup
- [ ] Reverse proxy

---

### Isi Rilis
- Panel user
- WHM basic
- Manual provisioning
- Tanpa billing

### Non Teknis
- Repo GitHub
- License open-source
- README

### Output
> Yumna Community v1.0

---

## STAGE 4 — DEMO PUBLIK & DOCS (BULAN 4)

### Demo
- Client area demo
- Service dummy

### Docs
- Install WHM
- Install Agent
- Install Panel

### Output
> Trust & adopsi

---

## STAGE 5 — BILLING CORE INTEGRATION (BULAN 5)

### Flow Provisioning Detail (Invoice → Server + Retry & Error State)

```
[User Order]
    ↓
[Invoice Created]
    ↓
[Payment Paid]
    ↓
[Billing Event: invoice.paid]
    ↓
[WHM Queue]
    ↓
[Provision Attempt #1]
    ├─ success → Service Active
    └─ fail → Retry Queue
            ↓
      [Retry #2 / #3]
            ↓
      Manual Review / Rollback
```

Error State:
- PAYMENT_OK + PROVISION_FAIL
- PROVISION_TIMEOUT
- AGENT_UNREACHABLE

Semua state tercatat di audit log & event store


---

### Billing Engine
- Product & pricing
- Order flow
- Invoice
- Payment gateway abstraction

### Integrasi
- Invoice paid → WHM provisioning
- Suspend overdue → WHM action

### Output
> Billing terhubung ke WHM

---

## STAGE 6 — USAGE-BASED BILLING (BULAN 6)

### Schema Database Final (Production Ready)

#### Users & Access
```sql
users(id, email, password_hash, role, status, created_at)
roles(id, name)
user_roles(user_id, role_id)
```

#### Core Hosting
```sql
servers(id, hostname, ip, status)
services(id, user_id, server_id, plan_id, status)
service_logs(id, service_id, action, created_at)
```

#### Billing
```sql
products(id, name, billing_type)
invoices(id, user_id, subtotal, tax, total, status)
payments(id, invoice_id, gateway, status)
```

#### Usage
```sql
usage_metrics(id, service_id, metric, value, recorded_at)
```
sql
users(id, email, password, role)
servers(id, hostname, status)
services(id, user_id, server_id, status)
```

#### Billing
```sql
products(id, name, price)
invoices(id, user_id, total, status)
payments(id, invoice_id, gateway)
```

#### Usage
```sql
usage_metrics(id, service_id, metric, value, recorded_at)
```

---

### Metering
- CPU
- Inode
- Bandwidth

### Integrasi
- Agent → Billing
- Usage → Invoice

### Output
> Billing berbasis pemakaian

---

## STAGE 7 — RESELLER & SUB-BILLING (BULAN 7)

### Fitur
- Reseller role
- Pricing markup
- Sub-client

### Output
> Cocok provider & mitra

---

## STAGE 8 — PAJAK & COMPLIANCE (BULAN 8)

### Indonesia Ready
- PPN 11%
- NPWP
- Invoice compliant

### Output
> Legal siap

---

## STAGE 9 — FRAUD & ABUSE CONTROL (BULAN 9)

### Billing
- Payment fraud detection

### WHM
- Abuse resource detection

### Output
> Risiko terkendali

---

## STAGE 10 — ENTERPRISE HARDENING (BULAN 10)

### Fitur
- SLA
- Audit trail
- Role granular

### Output
> Enterprise-ready

---

## STAGE 11 — HIGH AVAILABILITY (BULAN 11)

### Sistem
- HA WHM
- HA Billing
- Backup & DR

### Output
> Produksi besar

---

## STAGE 12 — MONETISASI & SUPPORT (BULAN 12)

### Bisnis
- Pricing enterprise
- License server
- Support tier

### Output
> Produk komersial matang

---

## 🏁 KESIMPULAN

Roadmap ini memastikan:
- Panel ↔ WHM ↔ Billing terintegrasi rapi
- Community tidak terganggu
- Enterprise bisa dimonetisasi

> **Yumna = ekosistem hosting lengkap (Panel + WHM + Billing)**

