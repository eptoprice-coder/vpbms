# Vendor Price Broadcast Management System (VPBMS)

A full-stack application for wholesalers (vegetables, fruits, flowers, etc.) to manage daily prices and broadcast formatted price lists to customers over WhatsApp using official `wa.me` deep links.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Zustand, TanStack Table, Recharts, Lucide React
- **Backend:** Node.js, Express
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT, bcrypt password hashing, role-based access control
- **Exports:** PDF (pdfkit) and Excel (exceljs), streamed directly from the API
- **WhatsApp:** Official `wa.me` deep links only — no unofficial/third-party WhatsApp APIs

## Project Structure

```
vpbms/
├── backend/
│   ├── src/
│   │   ├── config/        # DB connection, constants
│   │   ├── models/        # Mongoose schemas (Users, Vendors, Customers, Products, ...)
│   │   ├── middleware/     # auth, error handling, activity logging, validation
│   │   ├── controllers/    # business logic per resource
│   │   ├── routes/         # Express route definitions
│   │   ├── utils/          # WhatsApp message builder, PDF/Excel export helpers
│   │   ├── seed/           # sample data seeding script
│   │   ├── app.js
│   │   └── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages (login, admin/*, vendor/*)
│   │   ├── components/     # AppShell (sidebar+navbar), DataTable, Modal, StatCard, ...
│   │   ├── store/          # Zustand auth + UI (theme) stores
│   │   ├── lib/api.js       # axios client with JWT interceptor
│   │   └── hooks/useAuth.js # route guard hook
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local.example
├── docker-compose.yml
└── README.md
```

## Getting Started (Local, without Docker)

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI / JWT_SECRET as needed
npm install
npm run seed               # loads sample super admin, vendors, categories, products, customers
npm run dev                 # starts the API on http://localhost:5000
```

Seeded logins (also printed by the seed script):

| Role         | Username   | Password    |
|--------------|-----------|-------------|
| Super Admin  | admin      | Admin@123   |
| Vendor (veg) | freshmart  | Vendor@123  |
| Vendor (fruit)| fruitking | Vendor@123  |

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your backend
npm install
npm run dev                          # starts the app on http://localhost:3000
```

Visit `http://localhost:3000`, log in with one of the seeded accounts above.

## Getting Started with Docker

```bash
cp backend/.env.example backend/.env   # optional, compose sets sane defaults
docker compose up --build
```

This starts MongoDB, the backend API (port 5000), and the frontend (port 3000). Run the seed script once the containers are up:

```bash
docker compose exec backend npm run seed
```

## Core Modules Implemented

- **Auth:** JWT login, remember-me, forgot-password flow, session-aware route guards, role-based access (Super Admin vs Vendor).
- **Super Admin:** create/edit/disable/delete vendors, reset vendor passwords, assign vendor category, manage categories, manage the master product catalog, view vendor activity/reports, dashboard with charts (daily price updates, daily messages, category-wise activity, top vendors), immutable activity/audit log with PDF/Excel export.
- **Vendor:** dashboard with today's stats, product & price management (search, bulk price update, quantity, auto-computed difference, append-only price history with PDF/Excel export), customer management (CRUD, CSV import, groups, bulk checkbox delete, search/filter, PDF/Excel export), WhatsApp price-list preparation (auto-formatted message) and sending (per-customer `wa.me` links with send/fail confirmation and history), reports with date-range filters and export.
- **Cross-cutting:** global search across products/customers/vendors, toast notifications, confirmation dialogs, dark/light theme, responsive sidebar + mobile drawer, input validation and centralized error handling, security headers (helmet), rate limiting, Mongo query sanitization.

## Database Collections

`User`, `Vendor`, `Category`, `Product` (master catalog), `VendorProduct` (per-vendor price/quantity/status), `Customer`, `PriceHistory` (append-only), `MessageHistory`, `ActivityLog` (immutable audit trail), `Settings`.

## WhatsApp Sending Flow

1. Vendor updates prices on the Products page → each change is recorded in `PriceHistory`.
2. Vendor clicks **Prepare Price List** → backend builds a formatted message from today's priced products.
3. Vendor selects customers (checkbox multi-select) and clicks **Send via WhatsApp**.
4. The backend creates one `wa.me` link per customer and a `MessageHistory` record (status `pending`).
5. The vendor opens each link (this launches WhatsApp Web / Android / iPhone WhatsApp with the message pre-filled) and confirms **Sent** or **Failed** — browsers cannot programmatically detect WhatsApp delivery, so this manual confirmation step keeps the audit trail accurate.

## Production Deployment: Render (backend) + Cloudflare Pages (frontend)

### 1. MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com.
2. Database Access → add a user with a strong password.
3. Network Access → allow `0.0.0.0/0` (Render's IPs are dynamic) or Render's specific egress IPs if you're on a paid Atlas tier with IP access lists.
4. Copy the connection string (`mongodb+srv://...`).

### 2. Backend on Render
1. Push this repo to GitHub/GitLab.
2. In Render: **New → Blueprint**, point it at the repo — it will pick up `render.yaml` at the project root (root directory `backend`, build `npm install`, start `node src/server.js`, health check `/api/health`). Or create a **Web Service** manually with the same settings if you prefer not to use the blueprint.
3. Set environment variables on the service: `MONGO_URI` (from Atlas), `JWT_SECRET` (Render can auto-generate one), `CLIENT_URL` (your Cloudflare Pages URL — add it after step 3 below, comma-separate if you also have a custom domain).
4. Deploy. Confirm `https://<your-service>.onrender.com/api/health` returns `{"success":true}`.
5. Seed production data once, from your machine: `MONGO_URI="<atlas-uri>" JWT_SECRET="<same-secret>" npm run seed` from `backend/` (or add a temporary Render Shell command if you're on a paid plan).
6. Free-tier Render services spin down after inactivity (cold start ~30–60s on the next request) — upgrade to a paid instance for always-on production traffic.

### 3. Frontend on Cloudflare Pages
The frontend is fully client-rendered and already configured for static export (`output: 'export'` in `next.config.js`), so Cloudflare Pages just serves the built `out/` folder — no Cloudflare Workers/Functions needed.

1. Push the repo (if not already) to GitHub/GitLab.
2. In Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, select the repo.
3. Build settings: framework preset **Next.js (Static HTML Export)**, root directory `frontend`, build command `npm run build`, build output directory `out`.
4. Add environment variable `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://vpbms-backend.onrender.com`).
5. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately; add a custom domain under the project's **Custom domains** tab if you have one.

### 4. Wire CORS
Go back to the Render service and set `CLIENT_URL` to the Cloudflare Pages URL(s), e.g. `https://vpbms.pages.dev,https://app.yourdomain.com`, then redeploy the backend. The backend's CORS middleware (`backend/src/app.js`) reads this as a comma-separated allow-list.

### 5. Post-deploy checklist
- Log in with the seeded super admin account and immediately reset its password / create a real admin account, then disable or delete the seed accounts.
- Rotate `JWT_SECRET` if you ever shared it during setup.
- Confirm PDF/Excel export buttons work cross-origin (they hit the Render API directly via `window.open`, which Cloudflare Pages doesn't need to proxy).
- Set up Render's built-in health check + notifications, and Atlas's built-in backup schedule.

## Security Notes

- Passwords are hashed with bcrypt; plaintext is never stored or logged.
- JWTs are signed with `JWT_SECRET` (change this in production) and expire based on `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` (remember-me).
- All vendor-scoped routes verify the vendor's own `req.vendor._id` server-side — a vendor cannot access another vendor's data by guessing IDs.
- `ActivityLog` entries are never deleted by any route, preserving a tamper-evident audit trail.
- `helmet`, `express-rate-limit`, and `express-mongo-sanitize` are applied globally.

## Roadmap / Future-Ready Features (not implemented in this build)

These were called out as "future ready" in the spec and are intentionally left as extension points rather than built now, since they depend on external paid services or additional infrastructure decisions (WhatsApp Business API credentials, SMS gateway, email provider, push notification service, etc.):

- WhatsApp Business API integration (official, paid)
- SMS / Email price list delivery
- Push notifications
- Inventory tracking & customer self-service ordering
- Multi-language UI
- AI-based price suggestions
- Offline draft auto-save (currently prices are edited and saved in one action; a local-draft layer can be added with `localStorage` or IndexedDB on the frontend)

## License

Internal / proprietary — built for the requesting organization.
