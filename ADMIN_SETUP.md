# MELA MARKET — SECURE ADMINISTRATOR ACCESS & SERVER-SIDE AUTHENTICATION

This guide details the security architecture, private admin routing, server-side authentication, and role-based access control (RBAC) for **Mela Market**.

---

## 1. Security Architecture Summary

- **Zero Public Exposure:** There are no buttons, links, menus, or footer items anywhere on the public website or dashboard for the Admin login.
- **Dedicated Private Admin Route (`/admin/login`):** An isolated private admin login route separate from the storefront.
- **Protected Admin Dashboard Route (`/admin`):** Only accessible when server-side authentication verifies that the authenticated user possesses the `admin` role.
- **Server-Side Authentication & Role Verification:**
  - Endpoint `POST /api/admin/login` verifies administrator credentials and database role on the backend.
  - Generates a cryptographically signed HMAC-SHA256 session token (`Authorization: Bearer <token>`).
  - Endpoint `GET /api/admin/verify` verifies the caller's active admin session on the server.
- **Protected Backend API Endpoints:** All `/api/admin/*` routes strictly require the `requireAdminAuth` middleware. Requests without a valid admin token return `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`.
- **Not Relying on Hidden URLs:** Security is enforced by cryptographic server tokens, database role validation, and HTTP-level route guarding—never by URL obscurity alone.
- **Zero Exposed Credentials:** No passwords or secrets are hardcoded in the frontend code.
- **Cryptographic Storage:** Passwords use salted PBKDF2 with SHA-256 (100,000 iterations) and Supabase Auth (server-side bcrypt).

---

## 2. Admin Routes Overview

| Route | Purpose | Access Control |
|---|---|---|
| `/admin/login` | Private Administrator Authentication Gateway | Isolated private login route. Allows authorized admin sign-in and first-time registration. |
| `/admin` | Protected Administrator Dashboard | Restricted to verified administrators only. Unauthenticated or non-admin visitors are denied with HTTP 403 and redirected. |
| `/api/admin/*` | Protected Backend Administration API | Strictly requires server-side `Authorization: Bearer <token>` with verified `role === 'admin'`. |

---

## 3. How to Sign In via Private Route

1. Navigate directly to `/admin/login` in your browser.
2. Enter your authorized administrator email (e.g. `mikiaelebrhane21@gmail.com`) and password.
3. The server authenticates your credentials via `POST /api/admin/login`, confirms `role === 'admin'`, and issues a signed admin session token.
4. The dashboard at `/admin` unlocks, allowing you to manage inventory, track purchases, verify Telebirr/CBE payment receipt screenshots, and inspect server diagnostics.

---

## 4. Protected API Diagnostics

You can test server-side endpoint protection in the **Admin Dashboard > Database & Security** tab:

1. **Authorized Request:** Clicks `GET /api/admin/dashboard-stats` with `Authorization: Bearer <token>`, returning HTTP 200 and real-time server metrics.
2. **Unauthorized Simulation:** Sends a request to `/api/admin/dashboard-stats` without a token, proving that the server returns `HTTP 401 Unauthorized: Admin authentication token required`.
