# Mobile UI Specification

# Inventory Management System (IMS) — Mobile App Experience

**Version:** 1.0 (MVP Mobile)
**Prepared By:** NasFon
**Companion to:** `Frontend UI Specification.md`, `Product Requirements Document.md`

---

> **Canonical reference:** white-label APK/AAB distribution, runtime-vs-build-time branding,
> and the mobile build pipeline are specified in **`Product Architecture.md`** (the single
> source of truth). This document is UI-only; where the two conflict, the canonical document
> wins.

# 0. Scope & Ground Rules

This document is **UI-only**. It defines layout, navigation, components, interaction, and visual behaviour for the IMS mobile experience. It does **not** change schemas, APIs, RPCs, or business logic. It extends (never contradicts) the existing desktop/tablet `Frontend UI Specification.md`.

The mobile experience must feel like a **native app** on both Android and iOS:

* Fast, app-like navigation (no full-page reloads, instant transitions)
* Bottom navigation (thumb reach) instead of a desktop sidebar
* Large, comfortable touch targets (min 44×44pt iOS / 48×48dp Android)
* Respect platform safe areas (notch, status bar, home indicator)
* Native platform feel: Material 3 cues on Android, Human Interface cues on iOS, unified via the existing MUI + Tailwind design system

---

# 1. Target Devices & Viewport

| Bucket | Width | Notes |
| ------ | ----- | ----- |
| Small phone | 320–375px | iPhone SE / small Androids — single column, no compromise |
| Standard phone | 376–430px | iPhone 13/14/15, Pixel — primary design target |
| Large phone | 431–480px | Pro Max / Ultra — still single column |
| Foldable / small tablet | 481–768px | Optional 2-column where noted; otherwise single column |

* Base unit grid remains the **8px system** from the main spec.
* Base font: 16px body (prevents iOS zoom-on-focus), scales with system font size.
* Currency rendered as **₦** with 2 decimals (NGN) everywhere, matching PRD business rules.

---

# 2. Platform Adaptation (Android vs iOS)

The app renders one codebase but adapts subtle platform traits for a native feel.

| Element | iOS (Human Interface) | Android (Material 3) |
| ------- | --------------------- | -------------------- |
| Navigation | Bottom tab bar with center-weight; large titles | Bottom tab bar with icon+label; tonal elevation |
| Top bar | Translucent, large page title, left "Back" chevron | Solid color, up caret, screen-level title |
| Primary action | Centered floating / bottom sheet confirm | Filled button / FAB |
| Sheet style | Centered rounded sheet, grabber, 90% height max | Full-height sheet, edge-to-edge |
| Segmented control | iOS-style pill segmented | Material tab / chip group |
| Pull-to-refresh | iOS spinner | Material circular indicator |
| Dialog buttons | Right-aligned, bold confirm | Left-aligned, uppercase label |

All colours, radii, and spacing stay in sync with the MUI theme + Tailwind CSS variables (per main spec §3).

---

# 3. Global Layout Shell

```
┌─────────────────────────────┐
│   STATUS BAR (safe area)    │
├─────────────────────────────┤
│   TOP APP BAR (contextual)  │  ← title, back, actions
├─────────────────────────────┤
│                             │
│                             │
│      CONTENT AREA           │  ← scrollable, single column
│      (safe-area padded)     │
│                             │
│                             │
├─────────────────────────────┤
│   BOTTOM TAB BAR / FAB      │  ← primary nav / key action
├─────────────────────────────┤
│  HOME INDICATOR (safe area) │
└─────────────────────────────┘
```

## 3.1 Top App Bar
* Sticky, height 56dp.
* Left: back chevron (when navigated) or shop switcher (at root).
* Center/Left: screen title (iOS large title collapses to standard on scroll).
* Right: contextual actions (search, filter, more menu, profile).
* Search opens as an **expandable inline search field** (not a new screen) where lists exist.

## 3.2 Bottom Tab Bar
* Primary, persistent navigation (replaces desktop sidebar).
* Height 64dp (incl. safe-area padding), 5 items max.
* Items adapt by role (see §10). Default set for Shop Admin:
  1. **Dashboard** (home)
  2. **Products**
  3. **Sales / New Sale** (center, elevated primary action on Cashier)
  4. **Customers**
  5. **More** (Credit Book, Expenses, Reports, Settings, Audit, Shops/Users)

* Active state: filled tinted icon + label; inactive: neutral.
* Badge support: low-stock count, outstanding-credit alert dot.

## 3.3 Floating Action Button (FAB)
* Used for the single most frequent create action per screen:
  * Dashboard → New Sale
  * Products → Add Product
  * Customers → Add Customer
  * Expenses → Record Expense
* Extended FAB (label visible) on scroll-stable screens; standard circular on scroll-heavy lists.

---

# 4. Navigation Patterns

| Pattern | Use |
| ------- | --- |
| Bottom tabs | Top-level switching |
| Stack / push | Drill into detail (Product → Product Detail) |
| Bottom sheet | Quick forms, filters, payment entry, confirmation |
| Full-screen modal | New Sale flow, login, receipt view |
| Swipe | Swipe row left → actions (edit/delete); swipe right → back |
| Pull-to-refresh | List refresh (TanStack Query invalidate) |
| Deep link | Open receipt / sale by ID from notification (future) |

* Transitions: 200–300ms transform/opacity, GPU-only. Respect `prefers-reduced-motion`.
* Max nav depth kept shallow (≤3) so key actions stay 1–2 taps (main spec §11).

---

# 5. Design Tokens (Mobile)

Reuses the desktop theme. Mobile-specific deltas:

* **Touch target:** min 48×48dp (44pt iOS).
* **Card radius:** 16dp (large) for sheets/cards; 12dp for list rows.
* **Elevation:** subtle, tonal (M3) rather than heavy shadows.
* **Spacing:** 16dp page padding; 8dp between related items; 24dp between sections.
* **Safe area insets:** `env(safe-area-inset-*)` padding on shell edges.

---

# 6. Screens

> Each screen listed in the desktop spec maps to a mobile screen below. Layout = single column unless noted. Forms open in bottom sheets or full-screen modals.

## 6.1 Login
* Full-screen, centered logo + welcome.
* Email + Password fields (16px font to avoid iOS zoom).
* Primary "Login" button (full width, 48dp tall).
* Inline error via `FormHelperText`; friendly Zod messages.
* Biometric login (Face ID / Fingerprint) slot — optional future, shown as secondary button when available.
* No sidebar; transitions straight into the app shell on success.

## 6.2 Dashboard
* Greeting + shop name header.
* **Stat cards** in a 2-column grid (Total Products, Customers, Today's Sales, Revenue, Outstanding Credit, Expenses).
* **Low Stock** horizontal scroll chip row (tap → Products filtered).
* **Recent Sales** list (last 5), tap → Sale detail.
* Quick Actions as a horizontal icon row: New Sale, Add Product, Add Customer, Record Expense.
* Pull-to-refresh updates all widgets.

## 6.3 Products
* Search (inline expandable) + filter chip (status: All / In Stock / Low / Out).
* List rows: name, SKU, qty badge, price (₦), status pill.
* Tap row → Product Detail (view/edit/delete sheet).
* Swipe left → Edit / Delete (confirm dialog).
* FAB → Add Product bottom sheet (Name, SKU, Qty, Selling Price, Min Stock).
* Pagination: infinite scroll / "load more" (no desktop pager).

## 6.4 Customers
* Search by name/phone (inline).
* List rows: name, phone, outstanding credit (₦, red if >0), total purchases.
* Tap → Customer Detail: info, purchase history, credit + payment history tabs.
* Actions: Record Payment (bottom sheet), Edit (sheet).
* FAB → Add Customer sheet.

## 6.5 Sales
* Tabbed: **New Sale** (primary) | **History**.
* History list: receipt no., date, customer, method, total, status; tap → detail + Print/PDF.
* FAB (center, elevated) → New Sale full-screen flow.

## 6.6 New Sale (Full-Screen Flow)
Step 1 — **Customer:** search + select, or "Walk-in" chip.
Step 2 — **Items:** search products, tap to add, quantity stepper (±), live cart list.
Step 3 — **Summary & Pay:** subtotal, total, amount paid, remaining credit; payment method (Cash / Bank / POS) segmented control.
Step 4 — **Confirm:** Complete Sale (disabled while pending). On success → Receipt screen + toast.
Cancel at any step returns to previous without data loss (draft preserved).

## 6.7 Receipt
* Mobile ticket layout (matches 80mm thermal + A4 rules from PRD).
* Business logo/info, shop, receipt no., datetime, customer, items, total, method, remaining credit.
* Actions: Print (system print), Save Image (PNG), Download PDF.
* Back returns to Sales or Dashboard.

## 6.8 Credit Book
* Customer list with outstanding balance, last payment.
* Tap → credit + payment history.
* Actions: Record Payment (sheet), Mark Fully Paid (confirm).
* Access via **More** tab.

## 6.9 Expenses
* List (description, amount ₦, date, recorded by).
* FAB → Record Expense sheet (description, amount, date).
* Access via **More**.

## 6.10 Reports
* Cards: Sales, Revenue, Expenses, Credit, Inventory.
* Filter: Shop (Super Admin), Date Range (bottom sheet date picker).
* Generate → in-page summary; Print / PDF actions.
* Access via **More**.

## 6.11 Audit Logs
* Filterable list (user, shop, date, action) via sheet.
* Rows: date, user, role, action, resource, reason.
* Access via **More** (role-restricted).

## 6.12 Shops (Super Admin)
* List: name, address, phone, manager, status pill.
* Add / Edit / Disable via sheet/confirm.
* Access via **More**.

## 6.13 Users (Super Admin / Shop Admin)
* List: name, email, role, shop, status.
* Add / Edit / Activate / Deactivate.
* Access via **More**.

## 6.14 Business Settings
* Sections: Business Info, Logo (upload), Contact, Receipt Footer.
* Save Changes (full-width primary).
* Access via **More** → Settings.

---

# 7. Reusable Mobile Components

Built on existing MUI primitives + Tailwind (main spec §7), with mobile adaptations:

* **AppBar** (mobile top bar)
* **BottomTabBar**
* **FAB / Extended FAB**
* **BottomSheet** (primary mobile form/action surface)
* **FullScreenModal** (New Sale, Receipt, Login)
* **ListRow** (48dp min, leading icon/avatar, trailing value, swipe actions)
* **StatCard** (2-col grid)
* **FilterChip / SegmentedControl**
* **SearchBar** (inline expandable)
* **Stepper** (± quantity)
* **EmptyState** (icon + message + action)
* **SkeletonList** (TanStack Query loading)
* **Toast** (success/warning/error), **ConfirmDialog**
* **Badge** (low-stock / credit alert)

Forms: React Hook Form + Zod (main spec §3.1), inline errors, submit-blocked while invalid, duplicate-submit guard.

---

# 8. Notifications & Feedback

Matches main spec §8, optimized for mobile:

* **Toast** slides from top (iOS) / bottom (Android) — auto-dismiss 3s.
* **Haptic-style feedback** via subtle scale/opacity on tap (no real haptics required).
* **Pull-to-refresh** spinner on lists.
* **Skeletons** during load; **spinners** on button while pending.
* Low-stock + outstanding-credit surface as badge dot on tab and dashboard chip.

---

# 9. Gestures & Interaction

* Tap targets ≥48dp.
* Swipe row → contextual actions (edit/delete).
* Swipe from left edge → back (iOS); system back (Android).
* Pull down → refresh.
* Bottom sheet drag-to-dismiss; scrim tap to dismiss (confirm if unsaved).
* Long-press row → quick actions menu (optional).

---

# 10. Role-Based Mobile Nav

Bottom tabs adapt by role (main spec §10):

* **Super Admin:** Dashboard, Products, Sales, Customers, More (Credit, Expenses, Reports, Audit, Shops, Users, Settings).
* **Shop Admin:** same as above minus Shops/Users per access; full More set.
* **Cashier:** Dashboard, Products (view), Sales (New + History), Customers (view), More (Receipt/Settings minimal). No delete, no user/shop/audit/settings-edit.

Restricted actions hidden or disabled with a friendly "Permission denied" toast (main spec §8).

---

# 11. Responsive & Accessibility

* Single column always; 2-col stat grid only (fits small phones).
* Dynamic Type / system font scaling supported; no layout break at 200% text.
* Safe-area insets on all edges (notch, home indicator).
* Contrast meets WCAG AA; focus states visible; `prefers-reduced-motion` respected.
* Large, legible ₦ amounts; right-aligned numeric columns in lists.
* Confirm destructive actions; preserve filter/search state across nav (main spec §11).

---

# 12. Performance (Mobile)

Per AGENTS.md performance rules:

* Route-level code splitting (`React.lazy` + `Suspense`) for every mobile screen.
* Individual MUI imports; no barrel imports; tree-shaken icons.
* Debounced search (300ms); server-side pagination / infinite scroll (`range()`).
* Explicit column selection in Supabase queries (no `select('*')`).
* Prefetch Products/Customers for New Sale during idle.
* Lightweight CSS transitions only; no animation library.
* Virtualize lists >100 rows (`@tanstack/react-virtual`).

---

# 13. Open Questions (for clarification)

1. **Native wrapper vs PWA — RESOLVED: Capacitor.** Per `Product Architecture.md` Part 3, the
   mobile app is a Capacitor wrapper so it can be distributed as branded APK/AAB artifacts
   (white-label). One shared APK serves runtime-branded shops; per-client branded APKs are
   produced by CI from the same codebase. (A PWA cannot carry per-client app icon/name/splash.)
2. Confirm **bottom-tab item set** per role and whether Cashier's center tab is "New Sale" only.
3. Preference for **sheet vs full-screen modal** on forms (e.g., Add Product).
4. Any need for **offline mode** (draft sales / cached products) on poor connectivity?
5. **Brand font** — keep Roboto/system, or supply a custom mobile brand font?
