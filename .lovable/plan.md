
# Fuel Station Management — Full Persian Build Plan

This is a large scope. I'll deliver it in **5 phases**, each independently usable and verifiable. Confirm the plan (or tell me which phase to start with / skip) and I'll begin Phase 1 immediately.

---

## Phase 1 — Persian-only UI + Company Onboarding

**Goal:** the whole app is Persian (Dari) with RTL layout, and first launch shows a company registration form instead of a welcome page.

- Force language to `fa` (Dari), RTL globally, remove the EN/FA switcher from the UI. Keep the i18n infra so labels are centralized.
- Build a single Persian dictionary (`src/lib/dictionary.fa.ts`) and replace every visible English string across:
  pages, sidebar, dialogs, buttons, toasts, table headers, form labels, validation messages, empty states, report titles.
- Remove the welcome/landing route. Root `/` behavior:
  - not signed in → `/auth` (Persian)
  - signed in + no company row → `/onboarding/company`
  - signed in + company exists → `/dashboard`
- New table `company_profile` (singleton) with: name, owner_name, address, phone, email, website, tax_id, logo_url, currency, created_at, updated_at.
- New storage bucket `company-logos` for the logo upload.
- New route `/onboarding/company` — full Persian form with validation; on save, redirect to dashboard.
- Company info becomes the source of truth for invoice header + reports.

## Phase 2 — Dashboard Redesign

- Modern colorful Persian dashboard with fuel-station palette (deep blue + amber/orange + green accents).
- Live date/time (Persian calendar via `Intl.DateTimeFormat("fa-IR")`).
- Quick-access tiles: کارمندان، مشتریان، تأمین‌کنندگان، پمپ‌ها، فروش، انبار، مصارف، عواید، گزارش‌ها، تنظیمات.
- KPI cards: فروش امروز، فروش ماه، تیل باقیمانده، مجموع عواید، مجموع مصارف، سرمایه فعلی، سرمایه اصلی، تعداد مشتریان/کارمندان/تأمین‌کنندگان.
- Charts (recharts, already installed): daily sales bar chart, fuel mix pie, revenue vs expense line, top customers bar.
- Server fn `getDashboardStats` aggregates everything in one round trip.

## Phase 3 — Sales / Invoices / Pumps / Products

- **Sales menu "اصلی"** with: جدید، ذخیره (PDF)، پیش‌نمایش، حذف، ویرایش.
- **Invoice settings tab** ("تنظیمات فاکتور"): edit title, font, company name/address/phone/email/website, layout; Print / Save / Cancel / Preview.
- Invoice fields: مشتری، شماره، تاریخ، نام محصول، مشخصات، تعداد، فی، قیمت مجموعی، مجموع کل، قابل پرداخت. Buttons: ذخیره، حذف، ذخیره و فاکتور جدید.
- **Pumps page (6 pumps)**: per-pump card with شماره، تاریخ، تیل موجود، تیل فروخته، تاریخ آخرین پرشدن، تاریخ خالی شدن (پیش‌بینی)، مجموع عواید. Status color coded. Combined totals at bottom.
- **Product management** new table `products`: name, type, russian_pct, iranian_pct, supplier_id, purchase_price, selling_price, current_stock. CRUD page + integration with pumps/sales.
- **Sales analysis** with the 8 time filters (امروز، دیروز، این هفته، هفته گذشته، این ماه، ماه گذشته، سه ماه گذشته، همه). Filters reused in Reports.

## Phase 4 — Reports Center + Printing/PDF

- New `/reports` hub with categories: فروش، کارمندان، مشتریان، تأمین‌کنندگان، عواید، مصارف، سرمایه اصلی، سرمایه فعلی، انبار.
- Each report: filter bar (date range + entity), summary cards, detailed table, chart, دکمه‌های چاپ و PDF.
- PDF export via `jspdf` + `jspdf-autotable` with a Persian-capable font (Vazirmatn) bundled as an asset.
- Print uses a print-only CSS layout (`@media print`).
- Same module powers invoice PDF in Phase 3.

## Phase 5 — Settings + Audit Log + Cleanup

- **Settings** tabs: شرکت، سیستم (واحد پول، تاریخ، زبان، پشتیبان)، ماژول‌ها (فروش، پمپ، انبار، کارمند، گزارش).
- **Audit log** table `audit_log` (date, time, user_id, user_name, entity, action, description). Trigger-based capture for sales/expenses/products/employees/customers/vendors/pumps. New page `/audit` to browse and filter.
- Validation everywhere with Zod (already used) + Persian error messages.
- Strip mobile/Capacitor folders if any are present (none currently in repo — will confirm during work).

---

## Technical notes

- **Stack:** TanStack Start + Supabase (Lovable Cloud), already wired. New tables go through migrations with GRANT + RLS + `has_role('admin')` policies where appropriate.
- **i18n:** keep `LanguageProvider` but lock to `fa` and remove `LanguageSwitcher` mounts. All literals migrate to dictionary keys; a lint pass + grep ensures no English remains in `src/routes` or `src/components`.
- **Fonts:** load Vazirmatn (Google Fonts) for screen + bundle TTF for PDF.
- **No mobile code:** verified — no `capacitor.*`, `android/`, or `ios/` folders exist.

---

## Verification per phase

1. Phase 1: visit `/`, see Persian onboarding form when no company row exists; after save lands on dashboard; no English string anywhere on root/auth/onboarding/dashboard.
2. Phase 2: dashboard renders all KPI cards + charts, live clock ticks, RTL layout correct.
3. Phase 3: create invoice → save → PDF downloads with Persian text; pumps page shows 6 cards with live data.
4. Phase 4: each report opens, filters apply, PDF + print work.
5. Phase 5: settings save, audit log records a test edit.

---

**Scope check before I start:**
- This is ~3–5 turns of work and several migrations. OK to proceed in order (Phase 1 → 5)?
- Default currency = **افغانی (AFN)**. Change?
- Default fuel-station palette = deep blue `#0B3D91` + amber `#F59E0B` + green `#10B981`. Change?
