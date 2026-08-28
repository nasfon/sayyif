# Frontend/UI Specification

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

> **Canonical reference:** the multi-tenant product evolution — billing, per-shop branding,
> feature flags, configurable roles, and white-label APK/AAB distribution — is specified in
> **`Product Architecture.md`** (the single source of truth). This document reflects the
> original MVP scope and is kept for reference; where the two conflict, the canonical
> document wins.

# 1. Purpose

This document defines the user interface structure, navigation, layouts, pages, components, and user interactions for the Inventory Management System (IMS).

The goal is to provide a clean, responsive, modern, and easy-to-use experience across desktop, tablet, and mobile devices.

---

# 2. Design Principles

* Clean and modern interface
* Mobile-first responsive design
* Fast navigation
* Consistent UI components
* Minimal learning curve
* Accessible and readable
* Clear visual hierarchy

---

# 3. Design System

The UI is built with **Material UI (MUI)** as the component library and **Tailwind CSS** for layout and utility styling.

## Colors

* Primary
* Secondary
* Success
* Warning
* Error
* Neutral

Colors are defined in the MUI theme (`createTheme`) and exposed to Tailwind via CSS variables so both systems stay in sync.

## Typography

* Heading 1
* Heading 2
* Heading 3
* Body Text
* Caption

Typography uses the MUI type scale (Roboto by default, or a configured brand font).

## Border Radius

* Small
* Medium
* Large

Defined in the MUI theme (`shape.borderRadius`).

## Spacing

Use an 8px spacing system throughout the application (MUI `theme.spacing()` and Tailwind `space`/`p` utilities on the same 8px grid).

## Animations

* Use lightweight CSS transitions (transform/opacity) for hover and focus states; no heavy animation library is bundled.
* Respect `prefers-reduced-motion` (disable heavy animation for users who opt out).

---

# 3.1 Forms & Validation

All forms use **React Hook Form** with **Zod** schemas for validation.

* Each form defines a Zod schema (`z.object({ ... })`) that mirrors the backend rules.
* `zodResolver` integrates the schema with React Hook Form.
* Field errors render inline under inputs via MUI `FormHelperText`.
* Submissions are blocked while invalid; error messages use friendly text.
* Zod schemas are reused for both form validation and the client-side API layer input checks.

---

# 4. Layout

## Authentication Layout

Used for:

* Login

Components

* Logo
* Welcome Message
* Login Form

---

## Dashboard Layout

Components

* Top Navigation Bar
* Sidebar Navigation
* Page Header
* Breadcrumb
* Content Area
* Notification Menu
* User Profile Menu

---

# 5. Navigation

## Sidebar

* Dashboard
* Products
* Customers
* Sales
* Credit Book
* Expenses
* Reports
* Audit Logs
* Shops *(Super Admin only)*
* Users *(Super Admin / Shop Admin)*
* Business Settings
* Logout

---

# 6. Pages

## Login

Purpose

Authenticate users.

Components

* Email
* Password
* Login Button
* Error Message

---

## Dashboard

Widgets

* Total Products
* Total Customers
* Today's Sales
* Revenue
* Outstanding Credit
* Total Expenses
* Low Stock Products
* Recent Sales

Quick Actions

* New Sale
* Add Product
* Add Customer
* Record Expense

---

## Products

### Product List

Features

* Search
* Pagination
* Sort
* Filter
* Export (Future)

Columns

* Product Name
* SKU
* Quantity
* Selling Price
* Minimum Stock
* Status
* Actions

Actions

* View
* Edit
* Delete

Primary Button

* Add Product

---

## Product Form

Fields

* Product Name
* SKU
* Quantity
* Selling Price
* Minimum Stock

Buttons

* Save
* Cancel

---

## Customers

### Customer List

Columns

* Name
* Phone
* Outstanding Credit
* Total Purchases
* Actions

Actions

* View
* Edit
* Delete

Primary Button

* Add Customer

---

## Customer Details

Sections

* Customer Information
* Purchase History
* Outstanding Credit
* Payment History

Actions

* Record Payment
* Edit Customer

---

## Sales

### Sales List

Columns

* Receipt Number
* Date
* Customer
* Cashier
* Payment Method
* Total
* Status
* Actions

Actions

* View
* Print Receipt
* Download PDF
* Correct Sale *(Role Restricted)*
* Reverse Sale *(Role Restricted)*

Primary Button

* New Sale

---

## New Sale

Layout

### Customer Section

* Search Customer
* Walk-in Customer Option

### Product Section

* Search Products
* Add Products
* Quantity Controls

### Summary

* Subtotal
* Total
* Amount Paid
* Remaining Credit

### Payment

* Cash
* Bank Transfer
* POS

Buttons

* Complete Sale
* Cancel

---

## Receipt

Displays

* Business Logo
* Business Information
* Shop Name
* Receipt Number
* Date & Time
* Customer
* Purchased Items
* Total
* Payment Method
* Remaining Credit

Buttons

* Print
* Save Image (PNG)
* Download PDF

---

## Credit Book

Customer List

Columns

* Customer
* Outstanding Balance
* Last Payment
* Actions

Customer Details

* Credit History
* Payment History

Actions

* Record Payment
* Mark Fully Paid

---

## Expenses

Columns

* Description
* Amount
* Date
* Recorded By

Primary Button

* Record Expense

Expense Form

* Description
* Amount
* Date

Buttons

* Save
* Cancel

---

## Reports

Cards

* Sales Report
* Revenue Report
* Expenses Report
* Credit Report
* Inventory Report

Filters

* Shop
* Date Range

Buttons

* Generate
* Print
* Download PDF

---

## Audit Logs

Columns

* Date
* User
* Role
* Shop
* Action
* Resource
* Reason

Filters

* User
* Shop
* Date
* Action

---

## Shops

*(Super Admin only)*

Columns

* Shop Name
* Address
* Phone
* Manager
* Status

Actions

* Add Shop
* Edit Shop
* Disable Shop

---

## Users

Columns

* Name
* Email
* Role
* Shop
* Status

Actions

* Add User
* Edit User
* Activate
* Deactivate

---

## Business Settings

Sections

* Business Information
* Logo
* Contact Information
* Receipt Footer

Buttons

* Save Changes

---

# 7. Reusable Components

All components are built on **Material UI (MUI)** primitives and styled consistently with the theme.

* Button
* Input
* Select
* Checkbox
* Radio Button
* Switch
* Textarea
* Search Box
* Data Table — built with **TanStack Table** (sorting, filtering, pagination)
* Pagination
* Modal
* Drawer
* Dropdown Menu
* Tooltip
* Badge
* Card
* Alert
* Toast Notification
* Loading Spinner
* Skeleton (skeletons while TanStack Query data is loading)
* Empty State
* Confirmation Dialog

Form fields are registered with React Hook Form and validated with Zod (see section 3.1).

---

# 8. Notifications

Success

* Product Added
* Sale Completed
* Payment Recorded

Warning

* Low Stock
* Unsaved Changes

Error

* Validation Failed
* Network Error
* Permission Denied

---

# 9. Responsive Behaviour

## Desktop

* Full sidebar
* Multi-column layouts
* Tables with all columns visible

## Tablet

* Collapsible sidebar
* Optimized spacing
* Responsive tables

## Mobile

* Drawer navigation
* Single-column layouts
* Horizontally scrollable tables
* Large touch targets

---

# 10. Role-Based UI

## Super Admin

* Full navigation
* Multi-shop management
* User management
* Global reports

## Shop Admin

* Shop-specific dashboard
* Product management
* Customer management
* Sales
* Credit book
* Expenses
* Reports
* Audit logs

## Cashier

Visible pages only:

* Dashboard
* Products (View)
* Customers (View)
* New Sale
* Sales History
* Receipt Printing

Cashiers cannot:

* Delete records
* Manage users
* Manage shops
* Edit business settings
* View audit logs

---

# 11. User Experience Guidelines

* Confirm before destructive actions.
* Show loading indicators for all asynchronous operations (TanStack Query `isPending`/`isFetching`; skeletons and spinners).
* Invalidate and refetch relevant TanStack Query keys after every successful mutation.
* Display friendly validation messages (React Hook Form + Zod).
* Use toast notifications for completed actions.
* Preserve filters and search state while navigating.
* Prevent duplicate form submissions.
* Keep important actions within one or two clicks whenever possible.

