# IMS Project TODO

Tracking checklist for the Inventory Management System (IMS) MVP.

**Marker convention:** `[x]` = completed, `[ ]` = pending / not started.

---

## Phase 0 — Planning & Setup

- [x] Finalize requirements and confirm scope (MVP vs Future)
- [x] Confirm business rules (credit limits, receipt layout, currency)
- [x] Set up Git repository and branching strategy
- [ ] Provision Supabase project and Vercel project
- [x] Scaffold Vite + React + TypeScript project
- [x] Install and configure frontend libraries (MUI, Tailwind CSS, TanStack Query/Table, React Hook Form, Zod)
- [x] Set up project folder structure, MUI theme, and shared component library
- [x] Define environment variables and secrets management (.env.example)

Milestone: Project foundation ready.

---

## Phase 1 — Authentication & Core Setup

- [x] Create database schema (tables, indexes, constraints, RLS policies, RPC functions, seed roles)
- [x] Implement Supabase Auth (login, logout, session handling)
- [x] Create roles table and seed roles (Super Admin, Shop Admin, Cashier)
- [x] Implement user onboarding and role assignment
- [x] Create shops module (CRUD for Super Admin)
- [x] Implement audit log foundation
- [x] Implement dashboard layout shell (top bar, sidebar, navigation)

Milestone: Authenticated application shell with roles and shops.

---

## Phase 2 — Product & Inventory

- [x] Implement products CRUD
- [ ] Implement stock quantity management
- [ ] Implement product search, sort, filter, pagination
- [ ] Implement low stock threshold and low stock detection
- [ ] Implement stock history recording

Milestone: Inventory module complete.

---

## Phase 3 — Customers & Credit

- [x] Implement customers CRUD
- [x] Implement customer search by name/phone
- [x] Implement customer profile with purchase history
- [x] Implement credit balance tracking
- [x] Implement credit payments (record payment, mark fully paid)

Milestone: Customer and credit modules complete.

---

## Phase 4 — Sales, Receipts & Expenses

- [x] Implement sales processing (multiple products, payment methods)
- [ ] Implement automatic stock deduction
- [x] Implement sales history and search
- [x] Implement receipt generation, printing, and PDF download
- [x] Implement sales correction and reversal with reason and audit trail
- [x] Implement expenses module

Milestone: Core operational modules complete.

---

## Phase 5 — Reports, Dashboard & Settings

- [x] Implement dashboard statistics and widgets
- [x] Implement reports (sales, revenue, expenses, credit, inventory)
- [x] Implement business settings
- [x] Implement role-based UI visibility
- [x] Restrict cashier to a minimal POS home (daily sales count + own last 5; no financials)

Milestone: All MVP modules complete.

---

## Phase 6 — Testing & Hardening

- [ ] Execute test plan (unit, integration, E2E)
- [ ] Verify RLS policies and role permissions
- [ ] Test multi-shop isolation
- [ ] Security review and rate limiting checks
- [ ] Performance and responsiveness checks
- [ ] Fix defects found during testing

Milestone: Code complete and tested.

---

## Phase 7 — UAT & Go-Live

- [ ] Deploy to staging environment
- [ ] Execute user acceptance testing with stakeholders
- [ ] Collect feedback and finalize changes
- [ ] Deploy to production
- [ ] Train users and provide documentation
- [ ] Monitor post-launch

Milestone: MVP launched.

---

## Phase 8 — Mobile View (Native-App Experience)

Spec reference: `docs/Mobile UI Specification.md`

### Foundation & Shell
- [x] Define mobile design tokens (touch targets, safe-area insets, radii, elevation) reusing MUI theme + Tailwind CSS vars
- [x] Build mobile app shell: Top App Bar (contextual) + Bottom Tab Bar + safe-area padding
- [x] Implement bottom tab navigation with role-based item set (Dashboard, Products, Sales, Customers, More)
- [ ] Implement FAB / Extended FAB per screen (New Sale, Add Product, Add Customer, Record Expense)
- [x] Wire mobile navigation patterns (stack push, bottom sheet, full-screen modal, swipe, pull-to-refresh)
- [ ] Add platform adaptation layer (iOS HIG vs Android M3 cues) via single codebase
- [x] Route-level code splitting (`React.lazy` + `Suspense`) for every mobile screen

### Screens
- [x] Login (full-screen, inline errors, optional biometric slot)
- [x] Dashboard (2-col stat grid, low-stock chips, recent sales, quick actions, pull-to-refresh)
 - [x] Products (inline search, filter chips, swipe actions, infinite scroll, Add/Edit sheet)
 - [x] Customers (inline search, filter chips, swipe actions, infinite scroll, Add/Edit sheet)
- [ ] Sales (History tab + New Sale full-screen flow: customer → items → summary/pay → confirm)
- [x] Receipt (mobile ticket, Print / Save PNG / Download PDF)
  - [x] Credit Book (list, history, Record Payment, Mark Fully Paid)
- [x] Expenses (list, Record Expense sheet)
- [x] Reports (cards, shop/date-range filter sheet, Print/PDF)
- [x] Audit Logs (filterable list, role-restricted)
- [x] Shops (Super Admin list + Add/Edit/Disable)
- [x] Users (list + Add/Edit/Activate/Deactivate)
- [x] Business Settings (info, logo, contact, receipt footer)

### Reusable Mobile Components
- [ ] AppBar, BottomTabBar, FAB, BottomSheet, FullScreenModal
- [ ] ListRow (48dp, swipe actions), StatCard, FilterChip/SegmentedControl
- [ ] SearchBar (inline expandable), Stepper (± quantity)
- [ ] EmptyState, SkeletonList, Toast, ConfirmDialog, Badge

### Forms & Feedback
- [ ] Migrate forms to mobile surfaces (React Hook Form + Zod, inline errors, duplicate-submit guard)
- [ ] Toast notifications (success/warning/error) with platform slide direction
- [ ] Haptic-style tap feedback, pull-to-refresh, skeletons/spinners

### Accessibility & Performance
- [x] Safe-area insets on all edges; dynamic Type / system font scaling to 200%
- [ ] WCAG AA contrast, focus states, `prefers-reduced-motion`
- [ ] Debounced search (300ms), server-side pagination / infinite scroll, explicit column selection
- [ ] Virtualize lists >100 rows (`@tanstack/react-virtual`)
- [ ] Prefetch Products/Customers for New Sale during idle

### Verification
- [ ] `npm run build` and `npm run lint` pass on mobile changes
- [ ] Manual test on small/standard/large phone widths (Android + iOS emulation)
- [ ] Verify role-based mobile nav and restricted actions

Milestone: IMS usable as a native-feeling mobile app on Android and iOS.