# Deployment & Release Plan

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

This document defines how the Inventory Management System (IMS) is deployed, released, backed up, and recovered. It covers environments, CI/CD, database migrations, release process, and disaster recovery.

It expands on the deployment section of the System Architecture Document (SAD).

---

# 2. Environments

## Development

* Host: Local machine.
* Supabase: Development project.
* Purpose: Active development, unit and integration tests.

## Staging

* Host: Vercel preview/development deployment.
* Supabase: Separate staging project.
* Purpose: E2E, security, performance, and UAT.

## Production

* Host: Vercel (static SPA hosting — Vite build output).
* Supabase: Production project.
* Purpose: Live system for business users.

Environment Isolation

* Staging and production use completely separate Supabase projects.
* Test data never touches the production database.
* No service role key is shared between projects.

---

# 3. Environment Variables

Required Variables

* `VITE_SUPABASE_URL` — Supabase project URL.
* `VITE_SUPABASE_ANON_KEY` — public anon key (client-safe, protected by RLS).
* `SUPABASE_SERVICE_ROLE_KEY` — service role key (SQL/edge tooling only; never in the client bundle).
* `SUPABASE_DB_PASSWORD` — database password for the `supabase db` CLI (optional).
* Any third-party keys (PDF, storage) if used

Convention

* `VITE_` prefix means the value is bundled into the client by Vite. Only the anon key and URL may use it.
* The service role key is never referenced in the app; it bypasses RLS and is used only for database/edge tooling.
* The canonical (committed) template lives at `.env.example`.

Management

* Store in the hosting provider's project settings per environment (Vercel/GitHub Secrets).
* Never commit secrets to the repository (`.env*` files are git-ignored).
* Use different values per environment.

---

# 4. CI/CD Pipeline

## Continuous Integration

* On every pull request:
  * Run lint and type checks.
  * Run unit and integration tests.
  * Build check (`vite build`).
  * Deploy preview to Vercel (static SPA).

## Continuous Deployment

* Merge to main triggers:
  * Run full test suite.
  * Deploy to staging automatically (static SPA + Supabase migrations).
  * Run database migrations (after approval).
* Manual release step promotes staging to production.

---

# 5. Database Migrations

Process

1. Migrations created and tested against the development database.
2. Applied and verified against staging.
3. Backed up production before applying.
4. Applied to production as part of the release.

Notes

* Use Supabase migrations tooling.
* Never run ad-hoc schema changes directly in production.
* Destructive changes (drops, alters) require extra review.

---

# 6. Release Process

## Pre-Release Checklist

* All tests pass.
* Acceptance criteria verified on staging.
* RLS and role checks verified.
* Data migration script tested.
* Production database backed up.
* Release notes prepared.

## Release Steps

1. Freeze changes for the release.
2. Apply database migration to production.
3. Deploy frontend (static SPA) to Vercel production.
4. Run smoke tests (login, sale, receipt, reports).
5. Monitor logs and errors.
6. Announce completion.

## Rollback Plan

* Frontend: Revert to previous Vercel static deployment instantly.
* Database: Restore from backup (or apply reverse migration if safe).
* Rollback is triggered on critical errors or data integrity issues.

---

# 7. Backup & Recovery

## Backup Strategy

* Supabase automatic daily backups.
* Weekly manual snapshot before each release.
* Store at least 7 days of backups (retention per plan).

## Recovery Plan

* Restore process tested on a sandbox before go-live.
* RPO (Recovery Point Objective): up to 24 hours of data (daily backups).
* RTO (Recovery Time Objective): within a few hours for full restore.

## Backup Verification

* Quarterly restore drill to confirm backups are valid.
* Document the restore runbook.

---

# 8. Monitoring & Alerting

Monitoring

* Application errors (client-side error tracking, e.g. Sentry).
* Supabase dashboard (resource usage, failed requests, function logs).
* Auth failures and unusual activity.

Alerts

* High error rate.
* Failed migrations.
* Backup failure notifications.
* Low storage quota.

---

# 9. Maintenance Window

* Ideal time: outside business hours.
* Migrations and releases should not interrupt active sales.
* Non-destructive changes can be applied anytime; destructive ones need a maintenance window.

---

# 10. Launch Checklist (Go-Live)

* Production Supabase project created and configured.
* RLS policies verified in production.
* Initial data seeded (roles, shops, business settings).
* Environment variables configured in production.
* SSL/HTTPS verified.
* Smoke test on production.
* Users and training completed.
* Backup and monitoring active.

---

# 11. Post-Launch

* Daily check of error logs and dashboard.
* Weekly review of reports and data accuracy.
* Feedback collected from users for next iteration.
* Continuous improvement backlog maintained.
