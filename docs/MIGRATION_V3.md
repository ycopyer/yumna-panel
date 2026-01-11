# 🏗️ Migration Plan to v3 (Unified Architecture)

This document outlines the steps to migrate from the v2 Monolith (`app/`) to the v3 Micro-services/Modular structure.

## 1. Directory Structure (Stage 1) - ✅ Completed
- `panel/`: Created.
- `whm/`: Created (Initialized with package.json & Entry).
- `agent/`: Created (Initialized with package.json & Entry).
- `common/`: Created.

## 2. Component Migration Strategy

### Phase A: Panel (Client/Frontend) - ✅ Completed
**Source**: `app/client`
**Destination**: `panel/`
**Action**:
1. Move `app/client` contents to `panel/`. (Done)
2. Update build scripts/Vite config. (Pending verification)
3. Refactor API calls to point to new WHM endpoints (gradually).

### Phase B: WHM (Control Plane) - ✅ Completed (Stage 1 Scope)
**Source**: `app/server` (Partial)
**Destination**: `whm/`
**Action**:
1. Extract Route Handlers (API) from `app/server`. (Auth Routes Migrated)
2. Extract Database Logic. (DB Config & Helpers Migrated)
3. Remove system-level execution code (defer to Agent).
- **Moved Services**: `ServerNodeService.js`, `authStore.js`, `email.js`, `securityMonitor.js`

### Phase C: Agent (Executor) - ✅ Completed (Stage 1 Scope)
**Source**: `app/server` (Partial)
**Destination**: `agent/`
**Action**:
1. Extract `DockerService`, `NginxService`, `SystemInfo` logic.
2. Create an internal API/WebSocket for WHM to control Agent.
- **Moved Services**: `DockerService.js`
- **Implemented**: HTTP API & Heartbeat Mechanism

## 3. Immediate Next Steps
1. Initialize new `package.json` in `whm` and `agent`.
2. Move `app/client` to `panel`.
3. Assess `app/server` code for splitting.

---
**Note**: The existing `app/` directory will remain active until migration is verified.
