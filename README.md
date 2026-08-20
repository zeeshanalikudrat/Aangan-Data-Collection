# Aangan Trust Portal

A production-ready, minimal, mobile-first PWA for Aangan Trust.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **PWA**: Serwist (Workbox-based)
- **Backend**: Google Apps Script + Google Sheets + Google Drive
- **Deployment**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

## Architecture

```
Portal (Next.js PWA)
  → Form Registry (backend/forms/)
  → Individual Form Config (per-form config.json + fields.json)
  → Google Apps Script API (lib/gas-service.ts)
  → Google Sheets / Google Drive
```

Adding a new form requires only:
1. Creating a new folder in `backend/forms/`
2. Adding `config.json` and `fields.json`

The portal itself does not change.

## Folder Structure

```
src/
  app/              # Next.js App Router pages
  components/       # Reusable UI components
  lib/              # Business logic, API services
  types/            # TypeScript types

backend/
  forms/            # Form configurations (one folder per form)
```

## Deployment

This project is Vercel-ready. Push to your connected GitHub repo to deploy.
