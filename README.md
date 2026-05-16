# Order Tracker

Order-to-cash tracking for a landscaping supplies business. Built with Next.js 15 (App Router), TypeScript, Tailwind, and Vercel Postgres.

## Features

- Dashboard listing every order with computed status: **Pending / Delivered / Invoiced / Paid / Overdue**
- Overdue invoices flagged in red
- Add / edit orders with line items
- Delivery confirmation step (compare ordered vs. actually delivered)
- Invoice entry with automatic due-date calculation (Net 7 / 30 / 60 / On account)
- Payment recording (paid date + amount)
- Status filters
- CSV export for reconciliation
- HTTP Basic Auth (single user, credentials in env vars)

## Local development

```bash
npm install
cp .env.example .env.local      # then edit values
npm run migrate                 # runs scripts/schema.sql against POSTGRES_URL
npm run dev
```

Open http://localhost:3000 and authenticate with `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_URL` | Vercel Postgres connection string (auto-injected on Vercel) |
| `BASIC_AUTH_USER` | Basic-auth username |
| `BASIC_AUTH_PASSWORD` | Basic-auth password |

## Deployment

Deployed to Vercel with the Postgres integration. To run migrations after the DB is provisioned:

```bash
vercel env pull .env.production.local
POSTGRES_URL="$(grep ^POSTGRES_URL .env.production.local | cut -d= -f2- | tr -d '"')" npm run migrate
```
