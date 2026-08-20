# Multi-Courier Integration Platform Backend

A production-grade, extensible Node.js backend for an e-commerce logistics platform that unifies multiple courier partners (UrbaneBolt, MockCourier, etc.) behind a clean, pluggable architecture with standard REST contracts.

---

## Features

- **Pluggable Courier Architecture**: Based on the Adapter and Registry patterns. Adding new courier partners requires zero changes to controllers, routes, DTOs, or business services.
- **Concrete Integrations**:
  - **UrbaneBolt UAT API** (`https://uat.urbanebolt.in/api/v1/`): Authentication token auto-refresh, order manifest creation, public tracking, and shipment cancellation.
  - **MockCourier Adapter (Bonus)**: Fully simulated courier partner for offline development, integration tests, and proof of pluggability.
- **Order & Tracking Persistence**:
  - PostgreSQL database with Sequelize ORM.
  - Full request/response payload audit logging (`JSONB`).
  - **Append-only tracking history** (`tracking_events`) recording status changes and raw timestamps.
- **Crash-Resilient State Machine & Background Reconciliation**:
  - **Two-Phase Dispatch**: Pre-persists orders with `status: PENDING_DISPATCH` before external courier calls.
  - **Dedicated Worker Service (`src/worker.ts`)**: Standalone background worker recovering abandoned orders with **Redis Distributed Leader Locks**.
- **Distributed Token Caching (Redis / Multi-Pod)**:
  - Centralized token sharing across all pods with sub-millisecond retrieval.
  - Cluster-wide invalidation on `401 Unauthorized`.
  - Zero-dependency in-memory fallback for local development and offline testing.
- **Bulk Order Processing (Up to 100 Orders)**:
  - **Bulk Pre-Persistence (Outbox Pattern)**: Inserts all 100 orders into PostgreSQL as `PENDING_DISPATCH` in one query before execution, guaranteeing zero lost orders if the server crashes.
  - High-performance concurrent processing via controlled worker pools (`BULK_CONCURRENCY_LIMIT`).
  - Partial success handling (e.g., 95 succeeded, 5 failed) with per-order status breakdowns (`HTTP 207 Multi-Status`).
  - Idempotent on `order_id` to prevent duplicate shipment creation.
- **Resilience & Fault Tolerance**:
  - Exponential backoff retry with jitter for transient errors (5xx, timeouts, network drops).
  - Automatic re-authentication and 1-retry on token expiration (401/403).
  - Non-retryable 4xx client errors mapped to normalized error codes without leaking sensitive courier details.
- **Validation & Security**:
  - **AJV** JSON schema validation with field-level HTTP 400 error structures.
  - **Helmet** for HTTP security headers.
  - **JWT Authentication** (`jsonwebtoken`, `bcryptjs`) for user endpoints.
- **Winston Logging**:
  - Configurable format via `LOG_FORMAT=text` (colorized local format) or `LOG_FORMAT=json` (structured production format).
  - Contextual `requestId` and `orderId` tracing using `AsyncLocalStorage`.
- **Docker & Micro-Process Support**: Multi-stage `Dockerfile` and `docker-compose.yml` supporting separate API server and background reconciliation worker containers.

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Node.js 20+ & TypeScript** | Strongly typed runtime |
| **Express.js** | Web framework |
| **Sequelize ORM & PostgreSQL** | Relational data persistence & connection pooling |
| **Redis & ioredis** | Distributed token caching & leader lock synchronization |
| **AJV (Another JSON Schema Validator)** | Request schema validation |
| **Winston** | Configurable structured & text logging |
| **Helmet & CORS** | HTTP security & header enforcement |
| **JSON Web Tokens (JWT) & bcryptjs** | Authentication & password hashing |
| **Axios** | External HTTP client for courier partner APIs |
| **Jest & Supertest** | Automated unit and API integration testing |
| **Docker & Docker Compose** | Containerized deployment |

---

## Environment Variables Configuration

Copy `.env.example` to `.env` and configure your parameters:

```bash
cp .env.example .env
```

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `3000` | HTTP port for Express server |
| `NODE_ENV` | String | `development` | Environment mode (`development`, `production`, `test`) |
| `LOG_FORMAT` | String | `text` | Logging output format (`text` for local dev, `json` for production) |
| `LOG_LEVEL` | String | `debug` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `JWT_SECRET` | String | *secret* | Secret key for signing user JWT tokens |
| `JWT_EXPIRES_IN` | String | `24h` | JWT validity duration (e.g., `24h`, `7d`) |
| `DATABASE_URL` | String | `postgres://...` | PostgreSQL connection URL (e.g. `postgres://user:pass@localhost:5432/courier_hub`) |
| `DB_LOGGING` | Boolean | `false` | Enable SQL query logging in Winston |
| `DB_SYNC_ALTER` | Boolean | `true` | Automatically synchronize database schema with Sequelize |
| `REDIS_URL` | String | *optional* | Redis URL for distributed multi-pod token caching (e.g. `redis://localhost:6379`). Falls back to in-memory cache if omitted. |
| `REDIS_KEY_PREFIX` | String | `courier_platform:` | Namespace prefix for Redis cache keys |
| `REDIS_DEFAULT_TTL_SECONDS` | Number | `43200` | Token cache TTL in seconds (default 12 hours) |
| `RECONCILIATION_INTERVAL_MS` | Number | `60000` | Background worker reconciliation interval (in ms) |
| `RECONCILIATION_STALE_THRESHOLD_MS` | Number | `60000` | Threshold to treat PENDING_DISPATCH as stale (in ms) |
| `URBANEBOLT_BASE_URL` | String | `https://uat.urbanebolt.in/api/v1` | UrbaneBolt UAT API base endpoint |
| `URBANEBOLT_USERNAME` | String | `info@urbanebolt.com` | UrbaneBolt account username/email |
| `URBANEBOLT_PASSWORD` | String | `EKIcygsLVV5RCtPZ` | UrbaneBolt account password |
| `URBANEBOLT_CUSTOMER_CODE` | String | `UEBCUS0008` | Customer code for manifest creation |
| `COURIER_TIMEOUT_MS` | Number | `10000` | HTTP timeout (in ms) for external courier calls |
| `COURIER_RETRY_ATTEMPTS` | Number | `3` | Max retry attempts for transient courier failures |
| `COURIER_RETRY_DELAY_MS` | Number | `1000` | Initial exponential backoff delay (in ms) |
| `BULK_CONCURRENCY_LIMIT` | Number | `10` | Concurrency limit for bulk order processing |

---

## Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally OR Docker & Docker Compose

### 2. Local Setup
```bash
# Clone repository and install dependencies
npm install

# Build TypeScript
npm run build

# Run unit and integration tests (9 test suites, 31 tests)
npm test

# Run tests with coverage report
npm run test:coverage

# Start development API server with live reload
npm run dev

# Start development background worker process
npm run dev:worker

# Start production API server
npm start

# Start production dedicated worker process
npm run start:worker
```

### 3. Running with Docker Compose
To spin up the API server, dedicated background worker, PostgreSQL, and Redis:

```bash
docker-compose up --build
```

The application will be accessible at `http://localhost:3000`.

---

## API Endpoints Reference

### 1. System & Discovery
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health check (DB connectivity & active couriers) |
| `GET` | `/api/v1/couriers` | Lists all registered courier partners |

### 2. Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user account |
| `POST` | `/api/v1/auth/login` | Log in and receive JWT token |
| `GET` | `/api/v1/auth/me` | Get profile of authenticated user (`Bearer <token>`) |

### 3. Orders & Courier Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/orders` | Create single shipment with chosen `courier_partner` (Idempotent) |
| `GET` | `/api/v1/orders/:order_id/track` | Track live shipment status with courier & record history |
| `POST` | `/api/v1/orders/:order_id/cancel` | Cancel shipment with courier partner |
| `POST` | `/api/v1/orders/bulk` | Bulk create up to 100 orders concurrently |
| `GET` | `/api/v1/orders/:order_id` | Get full order details and tracking timeline from local DB |

---

## Example Requests & Responses

### 1. Create Shipment (`POST /api/v1/orders`)

#### Request Body:
```json
{
  "order_id": "ORD-2026-001",
  "courier_partner": "urbanebolt",
  "sender": {
    "name": "Rohit Athaley",
    "phone": "9425018023",
    "email": "seller@example.com",
    "address": "Plot No. 137 Sector-1 Industrial Area",
    "city": "Govindpura",
    "state": "BHOPAL",
    "pincode": "122001",
    "country": "India",
    "address_type": "Seller"
  },
  "recipient": {
    "name": "Satyam Convent School",
    "phone": "8320226438",
    "email": "customer@example.com",
    "address": "Plot No. 26-27, Om Nagar",
    "city": "Surat",
    "state": "GUJARAT",
    "pincode": "122017",
    "country": "India",
    "address_type": "Home"
  },
  "package_details": {
    "weight_kg": 1.1,
    "length_cm": 12,
    "breadth_cm": 10,
    "height_cm": 10,
    "items_count": 1,
    "item_description": "Books"
  },
  "payment_details": {
    "payment_mode": "COD",
    "collectable_amount": 500,
    "declared_value": 500
  },
  "service_type": "SDD"
}
```

#### Success Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "data": {
    "order_id": "ORD-2026-001",
    "courier_partner": "urbanebolt",
    "courier_order_id": "ORD-2026-001",
    "awb_number": "UB17870673894447855",
    "status": "CREATED"
  },
  "meta": {
    "requestId": "20ec7aa0-f2fd-43a1-941b-9d496ae45cda",
    "timestamp": "2026-08-18T15:35:00.000Z"
  }
}
```

---

## How to Add a New Courier Partner

The pluggable architecture allows you to onboard any new courier partner (e.g., Delhivery, Shiprocket, BlueDart, DTDC) with **3 simple steps**:

### Step 1: Create the Adapter Class
Create a new file under `src/adapters/<courier_name>/<courier_name>.adapter.ts` implementing `ICourierAdapter`:

```typescript
import { ICourierAdapter } from '../courier.interface';
import {
  NormalizedCreateOrderRequest,
  NormalizedCreateOrderResponse,
  NormalizedTrackingResponse,
  NormalizedCancelResponse,
} from '../../types/courier.types';
import { ShipmentStatus } from '../../constants/courier.constants';

export class DelhiveryAdapter implements ICourierAdapter {
  public readonly partnerName = 'delhivery';

  public async createShipment(order: NormalizedCreateOrderRequest): Promise<NormalizedCreateOrderResponse> {
    // 1. Transform internal order to Delhivery API schema
    // 2. Call Delhivery API with HTTP client
    // 3. Return normalized response
    return {
      order_id: order.order_id,
      courier_partner: this.partnerName,
      courier_order_id: `DEL-${order.order_id}`,
      awb_number: `DL${Date.now()}`,
      status: ShipmentStatus.CREATED,
      raw_response: {},
      raw_request: order,
    };
  }

  public async trackShipment(awbNumber: string, orderId?: string): Promise<NormalizedTrackingResponse> {
    // Call Delhivery tracking endpoint and map to NormalizedTrackingResponse
    return {
      order_id: orderId || '',
      courier_partner: this.partnerName,
      awb_number: awbNumber,
      status: ShipmentStatus.IN_TRANSIT,
      current_status_description: 'Package in transit',
      tracking_history: [],
      raw_response: {},
    };
  }

  public async cancelShipment(awbNumber: string, orderId?: string, reason?: string): Promise<NormalizedCancelResponse> {
    // Call Delhivery cancel endpoint
    return {
      order_id: orderId || '',
      courier_partner: this.partnerName,
      awb_number: awbNumber,
      status: ShipmentStatus.CANCELLED,
      cancelled_at: new Date().toISOString(),
      message: 'Cancelled with Delhivery',
      raw_response: {},
    };
  }
}
```

### Step 2: Register in `src/adapters/index.ts`
```typescript
import { DelhiveryAdapter } from './delhivery/delhivery.adapter';

export const initAdapters = (): void => {
  courierRegistry.register(new UrbaneBoltAdapter());
  courierRegistry.register(new MockCourierAdapter());
  courierRegistry.register(new DelhiveryAdapter()); // <-- Registered in 1 line
};
```

### Step 3: That's It!
- Consumers can now immediately submit orders with `"courier_partner": "delhivery"`.
- The system automatically handles routing, tracking, persistence, retries, and errors for Delhivery without changing any controllers, routes, DTOs, or database models.

---

## Running the Automated Test Suite

```bash
# Run all unit and integration tests (9 test suites, 31 tests)
npm test

# Run tests with code coverage
npm run test:coverage
```

Test coverage includes:
1. `tests/unit/urbanebolt-mapper.test.ts` (DTO mapping & status normalization)
2. `tests/unit/courier-registry.test.ts` (Dynamic registry & error handling)
3. `tests/unit/validation.test.ts` (AJV schema validation rules & bounds)
4. `tests/unit/retry.test.ts` (Exponential backoff & retry mechanics)
5. `tests/unit/cache.test.ts` (Redis and In-memory caching & distributed locks)
6. `tests/unit/reconciliation-worker.test.ts` (Order recovery & state-machine lifecycle)
7. `tests/integration/order.api.test.ts` (Order creation, tracking, cancellation, idempotency)
8. `tests/integration/bulk-order.api.test.ts` (Concurrent multi-partner bulk processing)
9. `tests/integration/auth.api.test.ts` (JWT registration, login & authenticated requests)

---

## Postman, REST Client & cURL Testing

- **VS Code / JetBrains HTTP Client**: Use [`requests.http`](file:///mnt/d/Akash/Projects/assignments/requests.http) to execute and test all requests directly inside your IDE.
- **Postman Collection**: Import [`postman_collection.json`](file:///mnt/d/Akash/Projects/assignments/postman_collection.json) into Postman. It includes pre-configured environment variables and test scripts for token chaining.
- **cURL Script**: Run the executable bash script:
  ```bash
  ./curl_examples.sh
  ```
