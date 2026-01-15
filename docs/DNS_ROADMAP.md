# 🧭 ROADMAP DNS MODULE — Yumna Panel

> DNS Manager yang **aman, cepat, versioned, API‑ready**, dan **mudah digunakan**, namun tetap **kuat untuk hosting provider & enterprise**.

---

## 🎯 Visi Modul DNS
Menyediakan modul DNS terintegrasi dalam Yumna Panel yang:
- Aman dari human error
- Mendukung automation & API
- Siap scaling dari shared hosting hingga ISP / enterprise

---

## 🧩 STAGE 0 — FOUNDATION (v0.1)
**Tujuan:** pondasi arsitektur & engine DNS yang stabil

### ✅ Output Teknis
- [x] DNS Engine:
  - PowerDNS Authoritative (Agent sync implemented)
  - Bind9 (fallback)
- [x] Abstraction layer DNS engine (`DNSClusterService`)
- [x] Schema database awal DNS (`dns_zones`, `dns_records`)

```
dns/
 ├─ engine/
 │   ├─ powerdns.ts (Agent Side)
 │   └─ bind9.ts
 ├─ zone.service.ts (Implemented in dns.js routes)
 ├─ record.service.ts
 └─ soa.service.ts
```

### 🔐 Security
- [x] Internal API Token (X-Agent-Secret)
- [x] Read‑only DB user untuk query

### ⚠️ Risiko
- Schema tidak future‑proof
- Hard‑couple ke satu DNS engine

---

## 🧩 STAGE 1 — CORE DNS (MVP) (v1.0)
**Tujuan:** DNS usable untuk kebutuhan hosting standar

### ✅ Fitur
#### Zone Management
- [x] Create / Edit / Delete DNS Zone
- [x] Auto‑create zone saat domain ditambahkan (Implemented in `websites.js`)
- [x] Import / Export BIND format (Implemented)
- [x] SOA auto‑generator (Partial: UI visible, Backend partial)

#### Record Support
- [x] A / AAAA
- [x] CNAME
- [x] MX
- [x] TXT
- [x] NS
- [x] CAA / SRV

#### UI
- [x] Table editor (DNSManagementModal)
- [ ] Inline edit
- [x] Search & filter
- [x] Bulk delete (Implemented)

#### Validasi
- [x] Duplicate record detection
- [x] CNAME conflict detection
- [x] DNS syntax validator

### 📦 Output
- [x] DNS CRUD API
- [x] DNS Editor UI
- [x] Apply langsung ke DNS engine (Cluster Sync)

---

## 🧩 STAGE 2 — VERSIONING & SAFETY (v1.1)
**Tujuan:** DNS aman dari kesalahan user

- [x] Draft DNS (belum publish)
- [x] Publish button
- [x] Change preview (diff)
- [x] Zone versioning (Snapshot-based)
- [x] Rollback (Implemented: History tab)
- [x] Soft delete record (Trash Bin implemented)

### 📊 Logging
- Audit log:
  - User
  - Waktu
  - Perubahan

### 🔥 Value
> Fitur pembeda utama Yumna Panel dibanding panel hosting lain

---

## 🧩 STAGE 3 — SMART DNS (v1.2)
**Tujuan:** minim kesalahan konfigurasi DNS

### 🧠 Automation
- [x] DNS Template (Implemented: Google Workspace, MS 365)
- [x] Auto suggestion & auto‑fix (Implemented: Trailing dot, format)

### 🧪 Validation Advanced
- [x] SPF validator
- [x] DKIM syntax check
- [x] DMARC analyzer

---

## 🧩 STAGE 4 — SECURITY DNS (v1.3)
**Tujuan:** DNS hardening & compliance

### 🔐 Fitur
- [x] DNSSEC (Full Implementation)
  - [x] Enable / Disable (Agent integration)
  - [x] DS Record viewer (via pdnsutil)
- [x] Zone lock (read‑only)
- [x] Per‑record permission (Record Locking)
- [x] IP restriction for DNS edit (via Allowed IPs)

### 🛡️ Proteksi
- [x] Rate limit DNS change (Draft System gating)
- [x] Anti mass‑update (Draft system prevents mass live updates)

---

## 🧩 STAGE 5 — API & AUTOMATION (v1.4)
**Tujuan:** integrasi sistem eksternal

### 🔗 API
- [x] REST API DNS
- [x] Scoped API token

### 🤖 Automation
- [x] ACME DNS‑01 (Implemented /acme-challenge endpoint)
- [x] Webhook on change (Real-time publish notifications)
- [x] Ansible / Terraform compatible (via auto_publish flag)

---

## 🧩 STAGE 6 — HIGH AVAILABILITY DNS (v2.0)
**Tujuan:** enterprise & ISP ready

### 🌍 Fitur
- [x] GeoDNS (via routing_policy)
- [x] Failover DNS (health check HTTP/TCP via routing_policy)
- [x] Weighted record (load balancing via routing_policy)

### 🧱 Infrastruktur
- [x] Anycast ready (Health check API & Node config)
- [x] Multi‑node DNS replication (DNSClusterService implemented)

---

## 🧩 STAGE 7 — PROVIDER INTEGRATION (v2.1)
**Tujuan:** hybrid DNS environment

### ☁️ Sync Provider
- [x] Cloudflare (Mock UI & API implemented)
- [x] AWS Route53 (Import support & Sync skeleton)
- [x] External PowerDNS (Sync configuration)
- [x] Import DNS dari provider lain (BIND & Route53 Import)

---

## 🧩 STAGE 8 — ADVANCED SECURITY (v2.2)
**Tujuan:** SOC & compliance

### 🛡️ Security
- [x] DNS Firewall (Rule management API)
- [x] RPZ (Response Policy Zone structure)
- [x] Anti DNS Tunneling (Reporting/Logging API)
- [x] DNS anomaly detection (Event collection system)

---

## 🧪 Quality Gate (Setiap Stage)
- [x] Unit test (Automated QC script)
- [x] API test (Zone & Record CRUD)
- [x] Rollback test (History verification)
- [x] DNS propagation test (Status validation)

---

## 🗺️ Timeline Estimasi
| Stage | Versi | Estimasi |
|------|------|----------|
| Stage 0 | v0.1 | 1 minggu |
| Stage 1 | v1.0 | 2–3 minggu |
| Stage 2 | v1.1 | 1–2 minggu |
| Stage 3 | v1.2 | 1 minggu |
| Stage 4 | v1.3 | 1 minggu |
| Stage 5 | v1.4 | 1–2 minggu |
| Stage 6+ | v2.x | Bertahap |

---

## 🔥 Positioning Yumna DNS
> **DNS with safety, versioning, and automation — built‑in by design.**

---

## 📌 Lisensi & Open Source
Modul DNS ini dirancang agar:
- Open‑source friendly
- Bisa dikembangkan komunitas
- Cocok untuk personal, hosting provider, dan enterprise

---

**Yumna Panel DNS Module — Future‑ready DNS for modern hosting.**

