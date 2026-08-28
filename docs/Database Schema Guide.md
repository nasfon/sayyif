# Database Schema Guide (Agents Read This)

Rules for designing and writing the Supabase schema. This is a **coding guide for
agents**, not a substitute for `docs/Database Design Document.md` (the spec).

Read this before creating tables, migrations, RPC functions, or triggers.

---

## 1. Foreign Keys

* Every `*_id` column is a **foreign key** with an explicit `REFERENCES` clause.
* Name FKs `table_name_id` (e.g., `product_id`, `sale_id`, `shop_id`).
* Define `ON DELETE` behavior explicitly on every FK:
  * `ON DELETE CASCADE` only for child rows that must die with the parent
    (e.g., `sale_items.sale_id`).
  * `ON DELETE RESTRICT` for financial/history rows — never cascade delete
    sales, credit payments, stock history, or audit logs.
  * Soft-deleted parents keep children (see section 7).
* Never create a `*_id` column without a matching FK.

## 2. Indexes

* Index **every FK column** (`shop_id`, `product_id`, `sale_id`, `customer_id`, ...).
* Index columns used in `WHERE`, `ORDER BY`, and joins. Design indexes around
  the queries, not the columns.
* Composite indexes where a query filters on multiple columns:
  * `(shop_id, created_at)` for shop-scoped lists sorted by date.
  * `(shop_id, sku)` unique per shop.
  * `(shop_id, quantity)` for low-stock checks.
* Unique indexes:
  * `receipt_number` (unique globally).
  * `(shop_id, sku)` (unique per shop).
* Use the query as written (RLS-aware): a filter on `shop_id` plus your index
  must be sargable — never wrap indexed columns in functions in `WHERE`.
* Keep the index count deliberate. Every index slows writes; only add what the
  queries need. **Measure, don't guess** (see section 9).

## 3. Constraints

* `NOT NULL` on every column that must always have a value.
* `UNIQUE` where a value must not repeat (see section 2).
* `CHECK` constraints for business rules — enforce in the DB, not just the UI:
  * `quantity >= 0` (products)
  * `selling_price > 0`, `amount > 0` (sales items, expenses, payments)
  * `quantity > 0` on sale items
  * `remaining_credit >= 0` on sales
* Status/type columns use `text` + `CHECK IN (...)` (or a Postgres `ENUM`) so
  invalid values are rejected at the database level.
* All constraints have descriptive names (`chk_products_quantity_nonnegative`).

## 4. Correct Data Types

| Value | Type | Why |
| ----- | ---- | --- |
| Primary keys | `uuid` | Global uniqueness, matches `auth.users.id` |
| Money / prices | `numeric(14,2)` | Exact decimal arithmetic — never `float`/`real` |
| Quantities | `integer` (or `numeric` if fractional) | Exact counts |
| Timestamps | `timestamptz` | Correct across timezones; use `now()` |
| Names / text | `text` (or `varchar(n)` with a real limit) | No artificial length limits |
| Phone / email | `text` | Store as entered; validate in app layer |
| Booleans | `boolean` | `is_active`, `is_deleted` flags |
| Status / method | `text` + `CHECK` or `enum` | Closed value sets |
| IDs | `uuid` | Always; never string-concatenated IDs |

Never store money as `float`, ids as serialized strings, or use `json` when a
relational column is the right shape.

## 5. Avoid Unnecessary Duplication

* **One source of truth per fact.** A value derived from other rows must not be
  stored as a separate editable column.
* No redundant columns like `sale.subtotal` + `sale.total` if both are derivable
  from `sale_items` — keep only what queries actually need.
* Where an aggregate is *frequently queried* and expensive to recompute (e.g.,
  customer `total_credit`), maintain it with a **trigger/function in the same
  transaction** as the change — never by a separate client write.
* Normalize first; denormalize only after `EXPLAIN ANALYZE` shows a real,
  measured hot path (section 9).

## 6. Design Around Queries

* Write the application's access patterns first (list sales by shop + date,
  low stock, outstanding credit per customer, dashboard totals).
* Then create tables/indexes/views that serve those queries directly.
* **Aggregates and reports run in SQL** (views or RPC functions), not in the
  client:
  * `dashboard_summary()`, `report_sales(start, end, shop)`, etc.
  * The client receives numbers, never a full table to sum up.
* Every list query is **paginated**; see section 8.
* RPC functions must accept the caller's shop scope and enforce RLS semantics.

## 7. Soft Delete

* `products`, `customers`, `users` use soft delete: `deleted_at` + `deleted_by`.
* All list queries filter `deleted_at IS NULL`.
* Sales, sale items, credit payments, stock history, and audit logs are
  **never deleted** — they are the immutable audit trail.

## 8. Pagination Cap: 30 Per Page

* **Never load more than 30 rows per request.**
* All list queries use `.range(0, 29)` (page size ≤ 30) via TanStack Table
  server-side pagination.
* The data layer takes `page` + `pageSize` (max 30) and returns rows + a count
  (or has-more flag) so the table can page without loading everything.
* No "load all", no `limit` with no bound, no fetching full tables into the
  client to sort/filter locally.

## 9. Measure, Don't Guess

* Profile before optimizing:
  * `EXPLAIN ANALYZE` on every non-trivial query (Supabase SQL editor).
  * Supabase query performance / RLS overhead checks.
  * Browser DevTools + React Profiler for the client.
* No speculative `useMemo`/`useCallback` (React Compiler handles it); add them
  only when the profiler shows a real hotspot.
* No speculative indexes; add them when a query shows a seq-scan on a hot path.
* Keep the perf budget: initial JS small, ≤30 rows per page, aggregates in SQL.
* If a calculation is cheap to measure and correct in SQL, it belongs in SQL.

## 10. Transactions (RPC Functions)

Important operations run as **single database functions** so the whole change
is atomic — never a sequence of independent client calls:

| Function | What it must do atomically |
| -------- | -------------------------- |
| `create_sale` | Insert sale + sale items, deduct stock, write stock history + audit log |
| `correct_sale` | Adjust items + stock, update status, write audit log (requires `reason`) |
| `reverse_sale` | Restore stock, update status, write audit log (requires `reason`) |
| `record_credit_payment` | Insert payment, update `total_credit`, validate ≤ outstanding |

Rules:

* Wrap in `BEGIN ... COMMIT` (function body is atomic by default in Postgres).
* Rollback on any failure — no partial stock deductions or partial payments.
* `SECURITY DEFINER` only where needed, and always validate the caller's
  `shop_id`/role before acting.
* Write the audit log inside the same transaction as the operation.
* Never trust client-supplied totals; recompute totals in SQL from the items.

---

## 11. Checklist Before Writing a Table

- [ ] Every `*_id` has a `REFERENCES` FK with explicit `ON DELETE`.
- [ ] Every `shop_id` is indexed; list filters are indexed + sargable.
- [ ] `NOT NULL` / `UNIQUE` / `CHECK` cover the business rules.
- [ ] Data types are exact (`uuid`, `numeric`, `timestamptz`, `text`).
- [ ] No duplicated/derivable stored values without a trigger-based reason.
- [ ] Tables serve the queries (access patterns written first).
- [ ] Lists are paginated, cap 30 per page.
- [ ] Money/aggregates computed in SQL, not the client.
- [ ] Sensitive ops are atomic RPC functions with audit logging.
