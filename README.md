# चव्हाण ट्रेडर्स — Chavan Traders

An enterprise management portal and bilingual web platform designed for agricultural grain trading businesses. Operates in Marathi and English to manage farmer procurement, wholesale sales, inventory, payments, and digital billing.

---

## 🌾 Overview & Features

- **Farmer Procurement (खरेदी)**: Rapid entry for bag-by-bag weights (`45 46 44` or `45+46+44`), automated deduction/cut calculations, hamali accounting, and spot payment tracking.
- **Wholesale Sales (विक्री)**: Client billing, stock availability checks, and integrated receivables.
- **Payments & Ledger (जमा-खर्च वही)**: Automated voucher series (`PV-XXXX` for disbursements, `RC-XXXX` for receipts), bill allocations, and live itemized running balance ledgers for each farmer and merchant.
- **Inventory & Stock (धान्य साठा)**: Multi-commodity stock ledger (Rice/Paddy, Soybean, Cashew, Groundnut, Finger Millet, etc.) with automated stock movement tracking.
- **Invoicing & Instant Sharing**: One-click pristine A4 PDF invoice generation, WhatsApp delivery, and secure public tokenized share links (`/b/[token]`).
- **Owner Security & Multi-User**: Role-based access control (Admin / Staff), audit logging, database health diagnostics, and soft-delete recovery.
- **Theme & Design**: 3-mode theme system (Light, Dark, System) built with Tailwind CSS v4 and full responsive layout (320px to 4K displays).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Credentials provider with bcrypt password hashing)
- **Database & ORM**: [Neon Serverless PostgreSQL](https://neon.tech/) with [Drizzle ORM](https://orm.drizzle.team/)
- **Internationalization**: Bilingual Marathi / English context engine
- **Testing**: [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/)

---

## ⚙️ Environment Variables

Create `.env.local` in the project root based on `.env.example`:

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL_POOLED` | Neon pooled connection string (with `-pooler` in host), used for runtime HTTP queries and schema checks. |
| `DATABASE_URL` | Neon direct connection string, used for DDL migrations. |
| `AUTH_SECRET` | 32-byte secret key for NextAuth JWT session encryption. |
| `AUTH_URL` | Base authentication URL (`http://localhost:3000` locally, `https://chavantraders.store` in production). |
| `NEXT_PUBLIC_SITE_URL` | *(Optional)* Public canonical URL (defaults to `https://chavantraders.store`). |

---

## 🚀 Local Development Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/sahilchavan9765-pixel/Chavan-Traders.git
   cd Chavan-Traders
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env.local` and add your database credentials and secret:
   ```bash
   cp .env.example .env.local
   ```

4. **Verify database connection**:
   ```bash
   npm run db:check
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

- **TypeScript check**: `npm run typecheck`
- **Unit tests**: `npm test`
- **Lint check**: `npm run lint`
- **Production build**: `npm run build`

---

## 🌐 Production Deployment (Vercel)

1. Connect the repository to [Vercel](https://vercel.com/).
2. Add the required environment variables in Vercel Project Settings:
   - `DATABASE_URL_POOLED`
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (`https://chavantraders.store`)
   - `AUTH_TRUST_HOST` (`true`)
   - `NEXT_PUBLIC_SITE_URL` (`https://chavantraders.store`)
3. Connect your custom domain `chavantraders.store` in Vercel Domains settings.
