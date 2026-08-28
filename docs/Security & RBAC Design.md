# Security & RBAC Design

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

> **Canonical reference:** the multi-tenant product evolution — billing, per-shop branding,
> feature flags, configurable roles, and white-label APK/AAB distribution — is specified in
> **`Product Architecture.md`** (the single source of truth). The multi-tenant access gates
> are summarized in §12 below; where this document conflicts with the canonical document,
> the canonical document wins.

# 1. Purpose

This document defines the security model for the Inventory Management System (IMS), including the detailed role-based access control (RBAC) matrix, Row Level Security (RLS) policy design, and general security requirements.

It expands on the security section of the System Architecture Document (SAD) and the Database Design Document (DDD).

---

# 2. Security Principles

* Security by default.
* Least privilege access.
* Server-side enforcement of all rules (RLS is the source of truth).
* UI hiding is not a security control.
* All sensitive actions are audited.
* Input validation on both frontend and backend.

---

# 3. Roles

| Role        | Scope         |
| ----------- | ------------- |
| Super Admin | All shops     |
| Shop Admin  | Assigned shop |
| Cashier     | Assigned shop |

---

# 4. Role-Permission Matrix

Legend: C = Create, R = Read, U = Update, D = Delete, V = View

| Module              | Super Admin | Shop Admin | Cashier |
| ------------------- | ----------- | ---------- | ------- |
| Shops               | CRUD        | -          | -       |
| Users               | CRUD        | CRUD*      | -       |
| Products            | CRUD        | CRUD       | R       |
| Customers           | CRUD        | CRUD       | R       |
| Sales (create)      | CRUD        | CRUD       | C       |
| Sales (correct)     | ✓           | ✓          | -       |
| Sales (reverse)     | ✓           | ✓          | -       |
| Receipts (print)    | ✓           | ✓          | ✓       |
| Receipts (PDF)      | ✓           | ✓          | ✓       |
| Credit Book         | CRUD        | CRUD       | -       |
| Credit Payments     | CRUD        | CRUD       | -       |
| Expenses            | CRUD        | CRUD       | -       |
| Reports             | All shops   | Own shop   | -       |
| Dashboard           | Global      | Own shop   | Own shop† |
| Audit Logs          | All shops   | Own shop   | -       |
| Business Settings   | ✓           | ✓          | -       |

\* Shop Admin can manage users within their assigned shop only, with roles limited to Shop Admin or Cashier (never Super Admin).

† The cashier dashboard is deliberately minimal: a single "New Sale" action, the
shop's **daily sales count**, and the cashier's **own last 5 transactions**. It exposes
no revenue, credit, expense, low-stock, or inventory figures. The standalone Products,
Customers, and Sales History pages are hidden from cashiers; their read access to
products/customers is retained only to power the New Sale pickers. `dashboard_summary`
is enforced server-side (raises `forbidden` for cashiers) so this is not a UI-only
restriction.

---

# 5. Row Level Security (RLS) Policy Design

## General Rule

Every business table contains `shop_id`. RLS enforces access at the row level.

## Policies

### Shops

* Super Admin: full access to all rows.
* Shop Admin / Cashier: SELECT only for their assigned shop (for shop info display).

### Products, Customers, Sales, Sale Items, Expenses, Stock History

* Super Admin: full access across all shops.
* Shop Admin / Cashier: full CRUD (per permission matrix) restricted to `shop_id = auth user's shop`.

### Sale Items

* Inherited access through the parent sale (`sale_id`) and shop.
* Accessible only if the parent sale belongs to the user's shop.

### Credit Payments

* Restricted by the customer's `shop_id`.
* Cashier cannot access (per matrix).

### Audit Logs

* Super Admin: all rows.
* Shop Admin: rows where `shop_id = user's shop`.

### Business Settings

* Super Admin: all rows.
* Shop Admin: own shop only.

### Roles

* Readable by all authenticated users (needed for display).
* Only Super Admin can modify.

---

# 6. How to Determine the User's Shop

RLS functions use the authenticated user's identity.

Approach

* On user creation, store the user's `shop_id` and `role_id` in the `users` table.
* Define a SQL function that returns the current user's `shop_id` and `role_id`, e.g. based on `auth.uid()`.
* Policies compare the row's `shop_id` against this value.

Note

* Role can be read from the users table or from JWT custom claims; use the database as the source of truth for RLS.

---

# 7. Authentication

* Supabase Auth (email/password).
* JWT access tokens with expiry and refresh tokens.
* Password hashing handled by Supabase.
* Login session stores user id, role, and shop.
* Inactive users cannot sign in.
* Password reset via Supabase email flow.

---

# 8. Authorization Flow Enforcement Points

1. RLS (database level) — primary control.
2. Database functions / triggers — server-side role and shop validation for sensitive actions (e.g., correct/reverse sale via RPC).
3. Supabase Auth session + client route guard — protect routes and redirect unauthenticated users.
4. Frontend UI — hide/disable unauthorized actions (display only).

---

# 9. Security Requirements

## Input Validation

* All forms validated on the frontend and re-validated on the backend.
* Reject invalid types, negative quantities, and amounts.
* Reject duplicate SKUs within a shop.

## Sensitive Operations

* Sale correction and reversal require a reason.
* Deletion of products/customers uses soft delete (with audit).
* Credit payments cannot exceed outstanding balance.

## Data Protection

* No sensitive data in logs.
* Environment variables for Supabase keys (client vs server keys).
* Never expose the service role key to the client.

## Rate Limiting

* Apply rate limiting to login and password attempts.
* Apply to report generation and PDF downloads where applicable.

## CORS

* Restrict allowed origins to the deployed application domain.

## Headers

* Use HTTPS everywhere (Vercel default).
* Set security headers (CSP, X-Content-Type-Options, etc.) where possible.

---

# 10. Audit Logging Requirements

Every sensitive action records:

* User
* Role
* Shop
* Action
* Entity
* Entity ID
* Reason (when applicable)
* IP address
* Date/time

Mandatory Audited Actions

* Login / logout
* User created / updated / deactivated
* Shop created / updated
* Product created / updated / deleted
* Customer created / updated / deleted
* Sale created / corrected / reversed
* Credit payment recorded
* Expense created / updated / deleted
* Settings updated

---

# 11. Security Testing Checklist

* Verify RLS blocks cross-shop reads and writes.
* Verify direct API calls without token are rejected.
* Verify cashier cannot access admin-only endpoints.
* Verify correction/reversal requires correct role and reason.
* Verify input validation blocks invalid data.
* Verify rate limiting on auth endpoints.
* Verify no service role key exposure in client bundle.
* Verify audit log entries are created for all mandatory actions.

---

# 12. Multi-Tenant Access Gates (Additive)

Per `Product Architecture.md`, the following extend the RBAC/RLS model for the multi-tenant
product. Tenant = shop for v1.

## Billing gate (`auth_has_access`)

Login is always allowed; *operations* are gated. A SECURITY DEFINER function
`auth_has_access() returns boolean` computes access from `shop_billing`:

- `trial` AND `now() < trial_end`
- `active` AND (`plan = 'onetime'` OR `now() < current_period_end`)
- `canceled` AND `now() < current_period_end`
- `past_due` AND `now() < current_period_end + 7 days` (grace)

Every operational RPC (`create_sale`, `correct_sale`, `reverse_sale`,
`record_credit_payment`, `record_manual_credit`, product/customer/expense writes, user
management) raises `subscription_required` unless `auth_has_access()` is true. The Paywall
reads only `shops` / `business_settings` / `shop_billing` (exempted).

## Permission helpers

- `auth_has_permission(p text) returns boolean` — joins users → roles → role_permissions;
  replaces within-shop role-*name* checks. `super_admin` stays hardcoded for cross-shop access.
- `auth_feature_enabled(feature text) returns boolean` — feature-flag gate from `shop_features`.

## Hard rules

- Every new SECURITY DEFINER helper must pin `set search_path = public` (RLS-takeover vector).
- `shop_id = auth_shop_id()` remains the **first** predicate in every policy, even alongside
  a permission check: `auth_is_super_admin() OR (shop_id = auth_shop_id() AND auth_has_permission(...))`.
- Enforce cross-shop isolation with a permanent CI test (Shop A token cannot read/write Shop B).
