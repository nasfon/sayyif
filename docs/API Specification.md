# API Specification

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**API Version:** v1

**Architecture:** Supabase Data API (PostgREST) + Database Functions (RPC)

**Authentication:** Supabase Auth (JWT)

**Data Format:** JSON

---

> **Canonical reference:** the multi-tenant product evolution — billing, per-shop branding,
> feature flags, configurable roles, and white-label APK/AAB distribution — is specified in
> **`Product Architecture.md`** (the single source of truth). This document reflects the
> original MVP scope and is kept for reference; where the two conflict, the canonical
> document wins.

# 1. Overview

The application does **not** implement a custom REST server. The React SPA talks directly to Supabase using the **Supabase JavaScript Client SDK**:

* **Auth** — handled by `supabase.auth` (sign in, session, sign out).
* **Data access** — handled by the Supabase **Data API (PostgREST)** which exposes database tables/views as REST endpoints (`/rest/v1/<table>`).
* **Business logic** — complex, transactional, or permission-sensitive operations (create sale + deduct stock, correct/reverse sale, record credit payment) are exposed as **database functions** called via `supabase.rpc(...)`.
* **Security** — Row Level Security (RLS) on every table is the source of truth for authorization.

---

# 2. Base URL

```
<SUPABASE_URL>/rest/v1
```

Where `SUPABASE_URL` is the Supabase project URL (e.g. `https://xxxx.supabase.co`), set in `.env` as `VITE_SUPABASE_URL`.

---

# 3. Authentication

The SDK attaches the JWT access token automatically. All table/function access is protected by RLS.

## Login

`supabase.auth.signInWithPassword({ email, password })`

Response

```json
{
  "user": { "id": "uuid", "email": "admin@example.com", "app_metadata": {} },
  "session": { "access_token": "...", "refresh_token": "..." }
}
```

## Logout

`supabase.auth.signOut()`

## Session

`supabase.auth.getSession()` / `supabase.auth.onAuthStateChange(...)`

---

# 4. Standard Response Format

PostgREST returns raw rows/arrays; the client wraps them for consistency (via a small API helper layer).

## Success (list)

```json
[ { "id": "uuid", "name": "Product" } ]
```

## Success (single)

```json
{ "id": "uuid", "name": "Product" }
```

## Error

```json
{ "code": "PGRST116", "message": "Row not found", "details": "..." }
```

Client error helpers normalize errors into:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

---

# 5. Data API Endpoints (Tables)

All endpoints below map to database tables and are called with the Supabase client query builder (`.from('shops').select(...)`). RLS determines what each role can read/write.

## Shops

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List shops         | `from('shops').select('*')`                     |
| Create shop        | `from('shops').insert(payload).select().single()` |
| Get shop           | `from('shops').select('*').eq('id', shopId).single()` |
| Update shop        | `from('shops').update(payload).eq('id', shopId)` |
| Disable shop       | `from('shops').update({ is_active: false }).eq('id', shopId)` |

---

## Users

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List users         | `from('users').select('*, role:roles(*)')` (paginated/filtered) |
| Create user        | `rpc('admin_create_user', { email, password, fullName, phone, roleName, shopId })` (auth account + profile) |
| Onboard user       | `rpc('admin_onboard_user', { userId, fullName, phone, roleName, shopId })` (assign role/shop to an existing auth account) |
| Get user           | `from('users').select('*').eq('id', userId).single()` |
| Update user        | `rpc('admin_update_user', { userId, fullName, phone, roleName, shopId, isActive })` (role/shop reassignment, activate/deactivate) |
| Reset password     | `rpc('admin_reset_password', { userId, newPassword })` |
| Unassigned auth users | `rpc('admin_list_unassigned_auth_users')` (auth accounts without a profile, pending onboarding) |

List supports pagination, search, and filter by role.

> **Note:** Creating or resetting credentials requires writing to `auth.users`, which the anon key cannot do. These operations run as `SECURITY DEFINER` functions that validate the caller's role/shop first (Super Admin, or Shop Admin within their own shop).

---

## Products

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List products      | `from('products').select('*')` (page, limit, search, `lowStock=true`) |
| Create product     | `from('products').insert(payload).select().single()` |
| Get product        | `from('products').select('*').eq('id', productId).single()` |
| Update product     | `from('products').update(payload).eq('id', productId)` |
| Delete product     | `from('products').update({ deleted_at: now() }).eq('id', productId)` (soft delete) |

---

## Customers

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List customers     | `from('customers').select('*')` (search by name/phone) |
| Create customer    | `from('customers').insert(payload).select().single()` |
| Get customer       | `from('customers').select('*').eq('id', customerId).single()` |
| Update customer    | `from('customers').update(payload).eq('id', customerId)` |
| Delete customer    | `from('customers').update({ deleted_at: now() }).eq('id', customerId)` (soft delete) |
| Purchase history   | `from('sales').select('*').eq('customer_id', customerId)` |
| Credit balance     | `from('customers').select('total_credit').eq('id', customerId).single()` |

---

## Sales

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List sales         | `from('sales').select('*, items:sale_items(*)')` (date/customer/payment-method/cashier filters) |
| Get sale           | `from('sales').select('*, items:sale_items(*)').eq('id', saleId).single()` |
| Create sale        | `rpc('create_sale', payload)` (transactional: sale + items + stock deduction) |
| Correct sale       | `rpc('correct_sale', { saleId, items, reason })` |
| Reverse sale       | `rpc('reverse_sale', { saleId, reason })` |
| Print receipt      | client-side render from fetched sale + business settings |
| Download PDF       | client-side PDF generation (e.g. jsPDF) from fetched sale |

---

## Credit Book

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| Outstanding credit | `from('customers').select('id, full_name, total_credit').gt('total_credit', 0)` |
| Record payment     | `rpc('record_credit_payment', { customerId, saleId, amount, paymentMethod })` |
| Payment history    | `from('credit_payments').select('*, customer:customers(*)')` |

---

## Expenses

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| List expenses      | `from('expenses').select('*')` (date filter)    |
| Record expense     | `from('expenses').insert(payload).select().single()` |
| Update expense     | `from('expenses').update(payload).eq('id', expenseId)` |
| Delete expense     | `from('expenses').delete().eq('id', expenseId)` |

---

## Dashboard

| Operation            | Client Builder                                  |
| -------------------- | ----------------------------------------------- |
| Dashboard summary    | `rpc('dashboard_summary')` (admin; returns totals + recent sales) |
| Cashier home         | `rpc('cashier_dashboard')` (cashier; daily sales count + own last 5) |

`dashboard_summary` is restricted to super admin / shop admin. Cashiers call the
scoped-down `cashier_dashboard`, which exposes no revenue, credit, expense, or
inventory figures.

---

## Reports

| Operation            | Client Builder                                  |
| -------------------- | ----------------------------------------------- |
| Sales report         | `rpc('report_sales', { startDate, endDate, shopId })` |
| Revenue report       | `rpc('report_revenue', { startDate, endDate, shopId })` |
| Expense report       | `rpc('report_expenses', { startDate, endDate, shopId })` |
| Credit report        | `rpc('report_credits', { startDate, endDate, shopId })` |
| Inventory report     | `rpc('report_inventory', { shopId })` |

Reports are implemented as database functions so aggregation and RLS enforcement stay server-side.

---

## Stock

| Operation            | Client Builder                                  |
| -------------------- | ----------------------------------------------- |
| Low stock            | `from('products').select('*').lt('quantity', 'minimum_stock')` |
| Stock history        | `from('stock_history').select('*, product:products(*)')` |

---

## Audit Logs

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| Get audit logs     | `from('audit_logs').select('*, user:users(*)')` (filter by user/date/action) |

---

## Business Settings

| Operation          | Client Builder                                  |
| ------------------ | ----------------------------------------------- |
| Get settings       | `from('business_settings').select('*').eq('shop_id', shopId).single()` |
| Update settings    | `from('business_settings').update(payload).eq('shop_id', shopId)` |

---

# 6. Database Functions (RPC)

Business-critical operations run as PostgreSQL functions to guarantee atomicity and enforce rules server-side.

| Function                  | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `admin_create_user`       | Creates an auth account + profile with role/shop assignment (Super Admin / Shop Admin). |
| `admin_onboard_user`      | Assigns role/shop to an existing auth account (creates its profile). |
| `admin_update_user`       | Edits profile, reassigns role/shop, activates/deactivates a user. |
| `admin_reset_password`    | Sets a new password for an existing user.                      |
| `admin_list_unassigned_auth_users` | Lists auth accounts still waiting to be onboarded.      |
| `create_sale`             | Inserts sale + sale items, deducts stock, writes stock history & audit log. Requires a customer (`p_customer_id`) for every sale regardless of payment method. |
| `correct_sale`            | Adjusts items and stock, updates sale status, requires `reason`. |
| `reverse_sale`            | Reverses a sale, restores stock, writes audit log, requires `reason`. |
| `record_credit_payment`   | Inserts credit payment, updates customer `total_credit`, validates against outstanding balance. |
| `dashboard_summary`       | Aggregates dashboard totals for the current shop scope (super admin / shop admin only). |
| `cashier_dashboard`       | Cashier home: shop's daily sales count + the caller's own five most recent sales. |
| `report_sales`            | Aggregated sales report for a date range / shop.               |
| `report_revenue`          | Aggregated revenue report.                                      |
| `report_expenses`         | Aggregated expense report.                                      |
| `report_credits`          | Aggregated credit report.                                       |
| `report_inventory`        | Current stock levels / valuation report.                        |

All functions are `SECURITY DEFINER` where needed but always validate the caller's `shop_id` and role before acting.

---

# 7. Data Access Layer (Client)

Queries and mutations are centralized so the UI never calls Supabase directly.

* **TanStack Query hooks** wrap every data fetch (caching, deduplication, invalidation).
* **Mutations** run through React Query then call `supabase.from(...)` / `supabase.rpc(...)`.
* **Zod schemas** validate all inputs on the client before a request is sent; database constraints/triggers re-validate server-side.
* **Error normalization** converts Supabase errors into the standard `{ success, message, errors }` shape for toasts and forms.

---

# 8. HTTP Status Codes (Supabase / PostgREST)

| Code | Meaning                   |
| ---- | ------------------------- |
| 200  | Success                   |
| 201  | Created                   |
| 204  | No Content                |
| 400  | Bad Request               |
| 401  | Unauthorized (missing/invalid token) |
| 403  | Forbidden (RLS blocks access) |
| 404  | Not Found / Row not found |
| 409  | Conflict                  |
| 422  | Validation Error          |
| 500  | Internal Server Error     |

---

# 9. API Design Principles

* No custom REST server — Supabase Data API (PostgREST) + RPC functions.
* JWT authentication via Supabase Auth (handled by the SDK).
* RLS is the enforcement point for row-level authorization.
* Complex transactional logic lives in database functions, not the client.
* JSON request and response bodies (SDK serializes automatically).
* Pagination for list endpoints (`.range(from, to)`).
* Filtering and searching where applicable (`.ilike`, `.eq`, `.gt`, `.lt`).
* Consistent error responses through a client error helper.
* Role-based access control (RBAC) and shop-level isolation enforced by RLS.
* Audit logging for sensitive operations via database triggers/functions.
