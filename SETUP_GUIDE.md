# VPBMS — Step-by-Step Setup Guide

Two paths below: **Part A** gets the app running on your own machine for development/testing. **Part B** deploys it to production on Render (backend) + Cloudflare Pages (frontend). Do Part A first to make sure everything works before deploying.

---

## Part A — Local Setup

### Step 1: Install prerequisites
- Node.js 18 or newer
- MongoDB running locally on port 27017, **or** a free MongoDB Atlas cluster (see Part B, Step 1, if you'd rather use Atlas from the start)

### Step 2: Unzip the project
Extract the project and open two terminal windows — one for `backend/`, one for `frontend/`.

### Step 3: Configure the backend
```bash
cd backend
cp .env.example .env
```
Open `.env` and set:
- `MONGO_URI` — leave as `mongodb://localhost:27017/vpbms` if running Mongo locally, or paste your Atlas connection string
- `JWT_SECRET` — replace with any long random string

### Step 4: Install backend dependencies
```bash
npm install
```

### Step 5: Seed sample data
```bash
npm run seed
```
This wipes and repopulates the database with a super admin, two demo vendors, categories, products, and customers. The terminal prints the login credentials — keep it open, you'll need them.

### Step 6: Start the backend
```bash
npm run dev
```
Confirm it's up by visiting `http://localhost:5000/api/health` — you should see `{"success":true}`.

### Step 7: Configure the frontend
```bash
cd frontend
cp .env.local.example .env.local
```
Confirm `NEXT_PUBLIC_API_URL=http://localhost:5000` (this is required — the app always talks to this URL directly).

### Step 8: Install frontend dependencies
```bash
npm install
```

### Step 9: Start the frontend
```bash
npm run dev
```
Open `http://localhost:3000`.

### Step 10: Test as Super Admin
Log in with `admin` / `Admin@123`. Walk through:
- Categories → add/edit one
- Product Master → add a product
- Vendors → create a vendor, edit it, disable/enable it, reset its password
- Activity Monitor → confirm your actions above are logged
- Dashboard → confirm charts render

### Step 11: Test as Vendor
Log in with `freshmart` / `Vendor@123`. Walk through:
- Products & Prices → change a price, click **Update Prices**, confirm the difference column and history update
- Customers → add one manually, try the CSV import button
- Send Price List → click **Prepare Price List**, select customers, click **Send via WhatsApp**, open a link, mark it Sent
- History → confirm the price update and message appear
- Reports → switch between Today/Week/Month filters

### Step 12: Test exports
Click the Excel and PDF buttons on Customers, Price History, Activity Log, and Reports — confirm files download and open correctly.

Local setup is done once all of the above works.

---

## Part B — Production Deployment (Render + Cloudflare Pages)

### Step 1: Create a MongoDB Atlas cluster
1. Sign up at https://cloud.mongodb.com and create a free (M0) cluster.
2. **Database Access** → add a database user with a strong password.
3. **Network Access** → add `0.0.0.0/0` (Render's outbound IPs aren't fixed on standard plans).
4. **Connect** → copy the `mongodb+srv://...` connection string.

### Step 2: Push the project to GitHub
Create a repository and push the `vpbms/` project (backend, frontend, `render.yaml`, README) to it.

### Step 3: Deploy the backend to Render
1. In Render: **New → Blueprint**, connect your repo. Render will detect `render.yaml` at the project root (root dir `backend`, build `npm install`, start `node src/server.js`, health check `/api/health`).
   - Alternative: create a **Web Service** manually with those same settings if you don't want to use the blueprint.
2. Set environment variables on the service:
   - `MONGO_URI` → your Atlas connection string from Step 1
   - `JWT_SECRET` → Render can auto-generate this
   - `CLIENT_URL` → leave a placeholder for now, you'll update it in Step 5
3. Deploy, then visit `https://<your-service>.onrender.com/api/health` to confirm it's live.

### Step 4: Seed production data
From your local machine (not Render's shell, unless you're on a paid plan with shell access):
```bash
cd backend
MONGO_URI="<your-atlas-uri>" npm run seed
```
This seeds the same production database your Render service is connected to.

### Step 5: Deploy the frontend to Cloudflare Pages
1. In Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, select your repo.
2. Build settings:
   - Framework preset: **Next.js (Static HTML Export)**
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Build output directory: `out`
3. Add environment variable `NEXT_PUBLIC_API_URL` = your Render backend URL from Step 3.
4. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately.
5. Optional: add a custom domain under the project's **Custom domains** tab.

### Step 6: Connect the two together (CORS)
Back in Render, update the backend's `CLIENT_URL` environment variable to your Cloudflare Pages URL (and custom domain, if any), comma-separated:
```
CLIENT_URL=https://vpbms.pages.dev,https://app.yourdomain.com
```
Redeploy the backend so the change takes effect.

### Step 7: Final production checklist
- Log in with the seeded super admin, then immediately change its password or create a new admin account and disable/delete the seed accounts.
- Rotate `JWT_SECRET` if it was ever shared or committed anywhere.
- Test the full flow end-to-end on the live URLs: login, price update, customer add, WhatsApp send, exports.
- Turn on Render's health check alerts and Atlas's automatic backups.
- If you're expecting real traffic, upgrade the Render service off the free tier (free tier cold-starts after inactivity).

---

## Quick Reference: Seeded Logins

| Role          | Username   | Password    |
|---------------|-----------|-------------|
| Super Admin   | admin      | Admin@123   |
| Vendor (veg)  | freshmart  | Vendor@123  |
| Vendor (fruit)| fruitking  | Vendor@123  |

**Change or remove these before real customer data goes into the system.**
