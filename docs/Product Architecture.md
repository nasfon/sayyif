# NasFon Inventory — Product Architecture (Single Source of Truth)

> **Canonical architecture document** for evolving the existing Inventory Management
> System (IMS) into a reusable, multi-tenant NasFon product.
> This merges the original architecture assessment, the billing/commercial-model design,
> and the mobile white-label (APK/AAB) design into one reference.
> **Status: spec for review. No code or schema has been changed.**

---

## 0. Guiding principle (the decision that anchors everything)

**One codebase for all customers. Always.**

- Tenant isolation, branding, features, and billing are **four orthogonal axes** — none
  of them requires a separate codebase.
- "Custom design" from customers means **visual identity only** (logo, colors, name,
  splash) — never custom business logic. Visual identity is delivered as **config** (at
  runtime) or as a **build-time skin** (for a customer's own APK), never as a code fork.
- A per-customer *codebase* is rejected. A per-customer *build artifact* (white-label APK)
  is acceptable and expected, produced from the shared codebase by CI.

This preserves the original product goal: **fix a core bug once → every customer benefits.**

---

## 0.1 Tenant model (the second anchor)

**Decision: tenant = shop for v1.** One paying customer = one `shop`. Billing
(`shop_billing`), branding (`business_settings`), feature flags (`shop_features`), and the
white-label APK config are all keyed to `shop_id`. The existing schema already models this,
so no `organizations` table is introduced yet — this keeps the evolution additive and avoids
a rewrite.

This is a *deliberate, temporary* simplification. It assumes clients are single-location
SMBs. The moment a real multi-branch client appears, the migration path is a new
**organization tier**:

```
Platform (NasFon)
   └─ Organization (paying client)        ← billing, branding, white-label, features live here (future)
        └─ Shop (branch)                   ← data isolation lives here (always)
```

Rules that follow from this decision:

- **Data isolation is always at the `shop` level** (`shop_id = auth_shop_id()` as the first
  RLS predicate). This never changes, even after an org tier is introduced.
- **Billing, branding, and white-label are keyed to the same entity as the tenant**
  (today: `shop`). They must never silently key off different entities.
- **The `org_id` column is reserved** — do not name a table "organization" or introduce a
  second tenant key without updating this section. A later `organizations` table is the only
  sanctioned way to group shops; nothing else may assume a client's shops are linked.

---

## Part 1 — Current-state assessment

### 1.1 Summary verdict
The existing system is **already ~80% of the way to a multi-tenant product**:
- Database is tenant-scoped by `shop_id` on every table.
- RLS enforced via `auth_shop_id()` / `auth_role_name()` security-definer helpers.
- All money/stock mutations run through atomic RPCs with `FOR UPDATE` row locks.

The work needed is **incremental extension, not a rewrite** — focused on three gaps:
self-serve onboarding, per-shop branding, and configurable roles/features (plus billing
and white-label build, added in Parts 2–3).

### 1.2 What must remain unchanged
- **`shop_id` on every business table + RLS on all of them** (`supabase/migrations/0001_init.sql:417-428`). Keep `shop_id = auth_shop_id()` as the *first* predicate in every future policy.
- **Atomic transactional RPCs** (`create_sale`, `correct_sale`, `reverse_sale`,
  `record_credit_payment`, `record_manual_credit`). `FOR UPDATE` locks on `products`
  (`0002_rpc_functions.sql:56`, `:177`) prevent overselling under concurrent cashiers.
  Do not replace with client-side inserts.
- **Trigger-maintained derived data** (customer credit, `remaining_credit` generated columns).
- **Audit logs written in the same transaction** as the operation (`0002:115` etc.).
- **Service-role usage confined to Edge Functions / SECURITY DEFINER** — client only holds
  the anon key (`src/lib/supabase.ts`).
- **Index strategy** (`0001:205-237`) and **soft deletes** (`deleted_at`).

### 1.3 What must change (minimum gaps)
1. **Self-serve shop onboarding** — shops only creatable by super admin today
   (`0001:435`); no signup UI (`src/services/auth.ts` has only `signInWithPassword`).
2. **Per-shop branding** — `business_settings` (`0001:188-199`) lacks brand colors/theme;
   MUI theme is hardcoded indigo (`src/styles/theme.ts:21`); sidebar/header shows generic
   "IMS" (`DashboardLayout.tsx:165`, `SidebarContent.tsx:62`).
3. **Configurable roles & features** — roles hard-locked to 3 values by a CHECK constraint
   (`0001:37`); RLS/RPC branch on role *name*; no feature-flag table.

### 1.4 Database architecture (additive)
- **`shop_features` table** (`shop_id, feature_key, enabled`) — dedicated table (gets RLS,
  auditable). Flags: `expenses`, `credit`, `reports`, `audit_logs`.
- **Branding columns on `business_settings`**: `primary_color`, `accent_color`, `theme_mode`
  (nullable; backward compatible).
- **Role/permission model**: add `role_permissions` (`role_id, permission_key, granted`) +
  a `permissions` catalog; make *within-shop* checks data-driven (see 1.5). Keep the 3-tier
  ontology; the cross-tenant `super_admin` stays hardcoded.

### 1.5 Security architecture
- **Keep `super_admin` hardcoded in RLS** for cross-shop access. Never make it editable data.
- **Replace within-shop role-name checks with permission checks**: add
  `auth_has_permission(p text) returns boolean` (SECURITY DEFINER, joins
  `users → roles → role_permissions`). Policy shape:
  `auth_is_super_admin() OR (shop_id = auth_shop_id() AND auth_has_permission('sales.create'))`.
  The `shop_id` equality predicate is **never removed** (defense in depth).
- **RLS refactor risk**: a dropped `shop_id` predicate = cross-shop leak. Mitigation: permanent
  CI policy test asserting Shop A's token cannot read Shop B rows.
- **Every new `SECURITY DEFINER` helper pins `search_path`**: `auth_has_permission`,
  `auth_has_access`, `auth_feature_enabled` must declare `set search_path = public` (the
  classic Supabase RLS-takeover vector). Treat this as a hard rule, not a convention.
- **Isolation is enforced by a permanent CI test, not by inspection.** Wire a local Supabase
  (`supabase/migrations/` + `supabase db reset`) into CI: assert that a Shop A token cannot
  read or write Shop B rows. Run on every PR; a dropped `shop_id` predicate must fail the
  build.
- **Onboarding must be server-enforced**: a SECURITY DEFINER `create_shop_for_owner()` RPC
  (or Edge Function) creates the shop + owner `users` row atomically; client never picks `shop_id`.
- **Stop writing `auth.users` directly** (`0003_user_management.sql:136-154` is brittle);
  consolidate on the supported `auth.admin` API already used by Edge Functions
  (`admin-create-user/index.ts:77`).
- Verify `SUPABASE_SERVICE_ROLE_KEY` is never a `VITE_*` var. Capture `ip_address` in audit
  (schema column exists at `0001:182` but RPCs don't populate it).

### 1.6 Feature architecture
- **Feature flags** (`shop_features`): UI hides nav items; backend guards via
  `auth_feature_enabled('expenses')` inside the relevant RPC/policy.
- **Optional business logic** (e.g., layaway): express as behavior over existing tables, never
  a schema fork. If new columns are truly needed, apply as a shared platform migration.
- Avoid a plugin/code-fork system unless a tenant needs genuinely custom workflows.

### 1.7 Performance
- `auth_shop_id()` is `stable` → evaluated ~once per query, not per row. Keep it `stable`.
- `FOR UPDATE` contention on a hot product causes latency, not incorrectness. Acceptable.
- Receipt numbers use a global sequence (`0001:115`, `0002:79`); not per-shop sequential
  (add a per-shop prefix config later if desired).
- Supabase: paginate (already done), watch anon-pool connections at scale, use pooling
  (port 6543) if needed. Lengthen `staleTime` for `business_settings`/branding.

### 1.8 Deployment
- **React + Supabase + Vercel is sufficient.** One deployed web app; tenant resolved by the
  user's `shop_id`. No subdomain routing required for correctness.
- Custom domains (`shopA.nasfon.com`) deferred — needs Vercel wildcard subdomains + edge
  middleware; only if a customer requires their own domain.
- Background jobs: Supabase `pg_cron` / Edge Functions. Tighten Edge Function CORS (`*`) to the
  app domain in production.

---

## Part 2 — Commercial model (confirmed decisions)

### 2.1 Decisions

| Question | Decision |
| -------- | -------- |
| Custom "design" scope | **Visual identity only** (logo, colors, name, splash) — never custom logic. |
| Codebase strategy | **One codebase for all customers.** |
| Payment options | Customer chooses **one-time (lifetime)** OR **monthly subscription**. |
| One-time definition | **Lifetime** — single payment, never expires. |
| Payment provider | **Paystack.** |
| Feature differences by plan | **None** — both plans get identical features. |
| Trial | **30 days**, full access, no up-front payment. |
| Expired / unpaid | **Login allowed**, but dashboard/navigation/operations blocked → "subscribe / renew" screen. |

### 2.2 Four orthogonal axes (recap)
```
ONE codebase (multi-tenant)
├── Data tenancy   → shop_id + RLS                 (isolation source of truth)
├── Branding       → business_settings / APK skin  (visual identity only)
├── Features       → shop_features flags           (same for all plans)
└── Billing        → shop_billing (plan + status)  (Part 2)
```
A customer picking one-time vs monthly is a **price**, not an architecture. A branding
customer still runs the **same backend**; they may get a white-label APK build (Part 3).

### 2.3 Billing state model

| status | meaning | has_access? |
| ------ | ------- | ----------- |
| `trial` | Within 30-day trial, unpaid | ✅ until `trial_end` |
| `active` | Paid. One-time = lifetime; monthly = within `current_period_end` | ✅ |
| `past_due` | Monthly renewal failed | ✅ for a 7-day grace, then ❌ |
| `expired` | Trial ended with no conversion | ❌ (blocked) |
| `canceled` | User canceled monthly; access until `current_period_end` | ✅ until period end, then blocked |

Lifecycle:
```
signup ─► trial (30d)
   ├─ pay one-time ───────► active (lifetime)
   ├─ pay monthly ────────► active (until period_end) ─┬ invoice.payment_succeeded → extend
   │                                                    ├ invoice.payment_failed   → past_due
   │                                                    └ subscription.cancel       → canceled
   └─ trial_end unpaid ───► expired (blocked)

Daily pg_cron: trial & now()>trial_end → expired; active(monthly) & now()>period_end & no renewal → past_due/expired
```

`has_access` (computed, never blindly stored):
```sql
(status = 'trial'   AND now() < trial_end)
OR (status = 'active' AND (plan = 'onetime' OR now() < current_period_end))
OR (status = 'canceled' AND now() < current_period_end)
OR (status = 'past_due' AND now() < current_period_end + interval '7 days')  -- grace
```

### 2.4 Data model (additive)
```sql
create table if not exists public.shop_billing (
  shop_id          uuid primary key references public.shops (id) on delete cascade,
  plan             text not null check (plan in ('onetime', 'monthly')),
  status           text not null default 'trial'
                     check (status in ('trial','active','past_due','expired','canceled')),
  trial_end        timestamptz not null default (now() + interval '30 days'),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  provider         text not null default 'paystack',
  provider_customer_id      text,
  provider_subscription_id  text,
  provider_authorization   text,
  updated_at        timestamptz not null default now()
);
create index if not exists idx_shop_billing_status on public.shop_billing (status);
```
`shops.is_active` stays the operational kill-switch; `has_access` is the commercial gate.

### 2.5 Access gating — "login allowed, operations blocked"
**Client (UI):** in `AuthProvider`/route guard, load profile + `shop_billing`, compute
`hasAccess`. If false → render a **Paywall** (renew/subscribe) instead of the layouts; all
nav/dashboard/operational pages unreachable. Paywall may read only `shops` /
`business_settings` / `shop_billing`.

**Server (DB) — mandatory backstop:** UI hiding is not security. Add:
```sql
create or replace function public.auth_has_access() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((
    select
      (b.status = 'trial'   AND now() < b.trial_end)
      OR (b.status = 'active' AND (b.plan = 'onetime' OR now() < b.current_period_end))
      OR (b.status = 'canceled' AND now() < b.current_period_end)
      OR (b.status = 'past_due' AND now() < b.current_period_end + interval '7 days')
    from public.shop_billing b
    where b.shop_id = public.auth_shop_id()
  ), false)
$$;
```
Guard every **operational RPC** (`create_sale`, `correct_sale`, `reverse_sale`,
`record_credit_payment`, `record_manual_credit`, product/customer/expense writes, user
management) with `if not public.auth_has_access() then raise exception 'subscription_required'; end if;`.
**Exempt** the subscription/renew path so a blocked user can still pay. Optionally extend the
`auth_has_access()` check to RLS `select` policies on operational tables (keep `shops` /
`business_settings` / `shop_billing` readable for the Paywall) — decision in Part 5.

### 2.6 Paystack integration (Edge Functions, service role only)
- **One-time:** `paystack-initialize` creates a transaction (`metadata:{shop_id, plan:'onetime'}`) →
  client redirected → `paystack-webhook` (`charge.success`, signature-verified, idempotent) sets
  `plan='onetime'`, `status='active'`, `current_period_end=null`, stores customer/authorization.
- **Monthly:** create a Paystack **Subscription** → `subscription.create` +
  `invoice.payment_succeeded` set `plan='monthly'`, `status='active'`, period dates; renewal extends
  `current_period_end`; `invoice.payment_failed` → `past_due`; `subscription.cancel` → `canceled`.
- **Webhook hardening:** verify `x-paystack-signature` (HMAC); store `provider_event_id` (unique) for
  idempotency; return 200 but log on error; never weaken RLS.

### 2.7 Onboarding flow
```
Sign up (Supabase Auth)
  └─ create_shop_for_owner() RPC → shop + owner profile + shop_billing(status='trial', trial_end=now()+30d)
       ▼
  Full dashboard (trial)
       ├─ pay (onetime|monthly) → Paystack → active
       └─ trial_end unpaid     → expired → Paywall (login allowed, ops blocked)
```
Both plans use the same multi-tenant path. A branding customer additionally gets a white-label
APK build (Part 3) — same backend.

---

## Part 3 — Mobile white-label (APK / AAB)

### 3.1 Runtime vs build-time branding
| | Runtime branding | Build-time branding |
|---|---|---|
| What | Logo/colors/name **inside app** after login | App **icon, name, splash** on device + Play Store |
| When | Always (Part 1.4 theming) | Only when a customer wants their own device/store identity |
| Per customer? | One shared app serves all shops | One **branded build** per customer |
| Rebuild? | No | Yes (APK/AAB per customer) |
| Codebase? | Same | **Same** (build differs, source does not) |

Icon/name/splash are OS-level assets — they **cannot** be runtime-configured. A per-customer
APK therefore requires a per-customer **build**, but from the **same codebase**.

```
ONE codebase ─┬─ Shared APK/AAB ("NasFon Inventory") → all non-branded shops (runtime branding)
              ├─ Branded APK/AAB for Shop A → Shop A's store listing
              └─ Branded APK/AAB for Shop B → Shop B's store listing   (one build per white-label)
```
Every build points at the **same multi-tenant backend + DB**; `shop_id` + RLS unchanged.

### 3.2 What differs per branded build (Capacitor `android/` project)
| Asset | Location |
| ----- | -------- |
| Package id (`applicationId`) | `android/app/build.gradle` → `applicationId "com.nasfon.shopa"` (unique) |
| App name | `res/values/strings.xml` → `app_name` |
| Launcher icon | `res/mipmap-*` (adaptive, all densities) |
| Splash screen | `res/drawable*/values/themes.xml` (native) + optional branded HTML splash in WebView |
| Native brand color | splash/status-bar color in `themes.xml` |
| Default in-app color/logo | injected into web build via branding config |

### 3.2.1 Build-time branding config (mechanism) + tenant pinning

Pre-auth branding and tenant pinning come from one per-client config, consumed at build time
by Vite and exposed as `window.__BRANDING__`:

```
branding/
├── shared/config.json          # "NasFon Inventory" defaults — used by the shared APK
└── <client-slug>/config.json   # per-white-label override
```

`config.json` fields: `appName`, `applicationId`, `primaryColor`, `accentColor`,
`themeMode`, `logoPath` (bundled asset), `splash` (native asset reference), and
`defaultShopId`.

- **Pre-auth UI is build-time branded.** The login screen, splash, and first paint render
  from `window.__BRANDING__` because `business_settings` is only readable *after* login.
- **Post-auth UI is runtime branded.** Once logged in, the app loads `business_settings` and
  the MUI theme follows the user's actual shop (Part 1.4), not the build config.
- **Tenant pinning:** a branded APK is *pinned* by `defaultShopId` for pre-auth display
  only. RLS — not the APK — is the security boundary: a user from another shop can still log
  in, but sees their own shop's data and post-auth branding. Never put a per-client *secret*
  in the build (the anon key is shared and RLS-protected).

### 3.3 Build pipeline (Capacitor + CI)
1. One shared repo: React app + `android/` Capacitor project + `branding/` per-customer configs.
2. Per white-label customer, a CI job (GitHub Actions): checkout shared codebase (fixed tag) →
   copy icon/splash/strings → set `applicationId` + app name → inject brand color/logo →
   `npm run build` → `npx cap sync android` → `./gradlew assembleRelease` (**APK**) and
   `./gradlew bundleRelease` (**AAB**).
3. APK = direct install; AAB = Play Store upload.

> **Automation is mandatory.** One core fix = one commit → CI rebuilds/re-publishes every branded
> app. This is why we reject per-customer *codebases* (manual porting) but accept per-customer
> *builds* (one pipeline run).

### 3.4 Shared backend
Each branded APK is a skinned client; login resolves `shop_id`, RLS shows only that shop. No
separate DB needed for visual white-label. Only a customer demanding their own infra/data residency
gets a build pointed at a different `VITE_SUPABASE_URL` (same codebase, different env) — rare.

### 3.5 Distribution — Managed Google Play first, public Play by exception

**Primary channel: Managed Google Play (private apps).** It distributes a branded app to a
*specific business's employees* without a public listing — no store listing, no privacy
policy, no Data Safety form, no public review, and no exposure to Google's spam /
repetitive-content / template-app policies. This is the correct default for white-label B2B
apps.

- **Public Play Store listings are the exception**, only for clients who genuinely want a
  public consumer-facing app. Google actively rejects near-duplicate / template apps, so each
  public listing must be materially the customer's own (distinct listing assets,
  descriptions, and — ideally — genuinely different value). Treat N public listings as a
  per-client business decision, not a default.
- **Format:** AAB is Play's required format (both channels); APK is for sideload/direct
  install. Both come from the same Gradle project.
- **Signing:** use Play App Signing (Google holds the real key); only the *upload key* is
  stored, per customer, in CI secrets (GitHub encrypted secrets or a secret manager). Lost
  upload keys = unable to update that app.
- **Play Billing is not required:** subscriptions are sold and billed via Paystack *outside*
  the app (web); the APK is a free client. Do not add Play Billing unless an in-app purchase
  of a digital good is introduced.
- **Who owns the listing?** Managed Play: NasFon's account (or a customer's managed org).
  Public Play: business decision per client (NasFon-owned account vs the customer's own Play
  Console); each public listing needs its own privacy policy and Data Safety form.

### 3.6 Maintenance reality — live-update is the default, not an optimization
- **Live-update (OTA web bundle) is the primary release path.** Adopt a Capacitor live-update
  service (Capacitor Live Update / Capgo, or self-hosted OTA) from day one. Every *web-only*
  change — bug fixes and feature work, the majority of the product — ships to all N branded
  apps in minutes, with **no store review**. The Play review queue is the release bottleneck
  for N apps; live-update removes it for web changes.
- **Native rebuild cadence is quarterly.** Rebuild + re-release APKs/AABs only when a
  *native* asset changes (icon, splash, `applicationId`, new plugin, Capacitor/SDK upgrade).
  Batch native changes into scheduled releases.
- **Version matrix.** Maintain a table per release: shared web version × per-app native build
  × backend migration, so any installed APK can be mapped to its compatible backend version
  and its branding config. Native builds are always backward-compatible with the shared
  backend (they only skin the client).

### 3.7 iOS caveat
Same pattern (separate bundle id/icons/splash/listing) but Apple is stricter on template/white-label
apps. Android-first recommended.

### 3.8 Branding kit intake (per white-label customer)
App name · package id preference · launcher icon (1024×1024 master) · splash image / brand color (hex) ·
primary brand color (hex) · logo (also from `business_settings`).

### 3.9 Decision tree
```
Customer wants own icon/name/splash on device + Play Store?
├─ NO  → Shared APK (runtime branding). One build for all.
└─ YES → White-label build: collect branding kit → one CI build → APK + AAB → same backend.
```

---

## Part 4 — Consolidated migration plan (backward-compatible, no rewrite)

- **Phase 1 — Onboarding + Billing.** `create_shop_for_owner` RPC (the "owner" is the new
  shop's first `shop_admin` — no new role is added); `shop_billing` table (keyed to
  `shop_id` = tenant per §0.1); Paystack `initialize` + `webhook` Edge Functions; 30-day
  trial; Paywall screen; `auth_has_access()` guard on operational RPCs. Keep super-admin shop
  creation.
- **Phase 2 — Branding.** Nullable `business_settings` color/theme columns; runtime MUI theme from
  shop branding; render shop logo/name in sidebar/header. Backward compatible.
- **Phase 3 — Feature flags.** `shop_features` table (default all on); UI nav gating +
  `auth_feature_enabled` guards.
- **Phase 4 — Roles/permissions.** `role_permissions`; convert *within-shop* RLS/RPC checks from
  role-name to permission helper, one module at a time, keeping `shop_id` predicate. Highest risk —
  do last, with cross-shop-leak CI tests.
- **Phase 5 — White-label APK pipeline.** Capacitor + CI branding builds for customers who need their
  own icon/name/splash/store listing. (Web app already multi-tenant; this only adds build artifacts.)
- **Phase 6 (later) — Subdomain/custom domain.** Only if a customer requires their own domain.

Each phase deploys independently.

---

## Part 5 — Consolidated risks

1. **RLS refactor (Phase 4)** = highest risk; dropped `shop_id` predicate = cross-shop leak. CI policy
   tests + keep `shop_id` first.
2. **Direct `auth.users` writes** can break on Supabase Auth upgrade → consolidate to `auth.admin` API.
3. **One-time = lifetime** is a business-model risk (permanent infra cost for one payment). Intentional?
4. **Read-gating depth (2.5):** strict write-gating + UI block suffices for the stated requirement.
   Adding `auth_has_access()` to RLS `select` strengthens exfiltration protection but needs Paywall
   reads exempted — **resolved: write-gate only in v1** (see Part 6).
5. **Grace period** for monthly `past_due`: requirement says block immediately; a 3–7 day grace is an
   ops option — **resolved: 7-day grace** (see Part 6).
6. **Artifact multiplication** (white-label): N APKs/AABs + N store listings. Source shared (good);
   release/QA/store ops multiply. Accept deliberately; automate CI from day one.
7. **Key/signing management**: lost upload keys = unable to update that app.
8. **Play policy**: near-duplicate / template apps can be rejected — mitigated by making
   Managed Google Play the primary channel; public listings remain the per-client exception
   and must be genuinely the customer's (see §3.5).
9. **Trial abuse**: repeated free signups — mitigate via email/payment-method limits (future).
10. **Supabase tier / connection limits** at scale — plan the tier early.
11. **Scope creep**: a "branded" customer asking for custom *logic* is the one case that breaks the
    single-codebase rule. Keep branding strictly visual.
12. **Paystack regional scope**: primarily Nigeria/Africa; a second provider (Stripe) if selling elsewhere.

---

## Part 6 — Resolved decisions (previously open)

- **Grace period:** monthly `past_due` gets a **7-day grace** before blocking. Hard-block-
  immediately causes support tickets and churn. `has_access` treats the grace window as
  allowed: `status = 'past_due' AND now() < current_period_end + interval '7 days'`.
- **Read-gating:** **write-gate only in v1.** `auth_has_access()` guards operational RPCs
  (writes) and the UI Paywall blocks reads. Do **not** add `auth_has_access()` to RLS
  `select` policies in v1; keep `shops` / `business_settings` / `shop_billing` readable for
  the Paywall. Revisit read-gating as a hardening item only if exfiltration becomes a
  concern.
- **Plan changes / refunds:** initial choice only in v1 (one-time **or** monthly, chosen at
  signup). Upgrade/downgrade and refunds are deferred to a later phase.
- **Play Console ownership:** Managed Google Play is NasFon-managed (primary). Public Play
  listing ownership is a per-client business decision (see §3.5).
- **Supabase Cloud:** assumed (required for `pg_cron` billing sweeps, Edge Functions, and
  Storage); confirm the plan/tier before go-live (affects connection limits and backups).

---

*This document supersedes the separate Architecture Assessment, Billing, and White-Label docs.
Status: spec for review. No implementation performed.*
