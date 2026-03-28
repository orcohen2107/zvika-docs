# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**zvika-docs** is a document authentication system for managing and verifying shipment certificates. Users can upload and parse PDFs to extract shipping document data, compare documents for discrepancies, and track verification history. The app uses Supabase for authentication and role-based access control (admin, user).

**Stack:** Next.js 14, TypeScript (strict mode), React 18, Supabase SSR, Tailwind CSS, pdf-parse

## Development Commands

```bash
# Start dev server (localhost:3000)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run ESLint
npm run lint
```

## Project Structure

```
src/
├── app/               # Next.js App Router pages and layouts
│   ├── page.tsx       # Root page (redirects to /dashboard or /login)
│   ├── layout.tsx     # Root layout with metadata and RTL/Hebrew setup
│   ├── login/         # Public: login page
│   ├── register/      # Public: registration page
│   ├── dashboard/     # Protected: main app features
│   │   ├── page.tsx   # Dashboard home (PDF upload & parsing)
│   │   ├── compare/   # Document comparison tool
│   │   └── history/   # Verification history
│   ├── admin/         # Protected: admin dashboard
│   ├── api/           # Server-side API routes
│   │   └── parse-pdf/ # POST endpoint to parse PDF files
│   └── globals.css    # Tailwind + global styles
├── lib/
│   ├── supabase/      # Supabase client initialization
│   │   ├── client.ts  # Browser client
│   │   └── server.ts  # Server-side client (used in middleware)
│   ├── pdf-parser.ts  # PDF text parsing logic (extracts doc numbers, amounts, dates, names)
│   ├── comparison.ts  # Document comparison logic
│   └── utils.ts       # Utility functions
├── components/        # Reusable React components
│   └── navbar.tsx     # Navigation bar
├── types/
│   └── index.ts       # TypeScript type definitions (PdfEntry, etc.)
└── middleware.ts      # Authentication middleware (protects routes, manages redirects)
```

## Key Architecture Patterns

### Authentication & Route Protection
- **Middleware** (`middleware.ts`) handles all auth checks via Supabase
- Public routes: `/login`, `/register`, `/pending-approval`
- Protected routes: `/dashboard`, `/admin` — redirect to `/login` if not authenticated
- Authenticated users accessing public routes redirect to `/dashboard`

### PDF Processing
- Endpoint: `POST /api/parse-pdf` — receives PDF file, extracts text using `pdf-parse`
- Parser (`pdf-parser.ts`) uses regex to find shipment document numbers (format: `SH########`)
- Extracts: document number, short code (last 4 digits), client name (Hebrew), amount, date
- Deduplicates entries using a Set

### Client vs Server Auth
- **Client:** `createClient()` in `src/lib/supabase/client.ts` (uses public keys)
- **Server:** `createServerClient()` in middleware and `src/lib/supabase/server.ts` (handles cookies)
- Server auth is synchronous, client auth is asynchronous

### Styling
- **Tailwind CSS** with dark/light modes (see `globals.css`)
- **RTL Layout:** Root layout sets `lang="he"` and `dir="rtl"` for Hebrew interface

## Important Notes

### TypeScript
- Strict mode enabled (`strict: true`)
- Path alias configured: `@/*` maps to `./src/*`
- All components and utilities are typed

### External Package Configuration
- `pdf-parse` is marked as `serverComponentsExternalPackages` in `next.config.mjs` because it uses Node.js APIs (only works in API routes and server-side functions)

### Environment Variables
- Supabase credentials required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- See `.env.local` for template

### Language & Localization
- App is primarily Hebrew
- RTL styling applied globally
- Hebrew text parsing in PDF parser (uses Unicode range `\u0590-\u05FF`)

## Common Development Tasks

### Add a new protected page
1. Create folder under `src/app/dashboard/` or `src/app/`
2. Add `page.tsx` component
3. Middleware automatically protects it based on path

### Update PDF parsing logic
- Modify regex in `src/lib/pdf-parser.ts`
- Update type definitions in `src/types/index.ts` if new fields are needed
- Test with sample PDFs; regex handles document numbers, amounts, dates, Hebrew client names

### Add API endpoint
- Create route file in `src/app/api/[route]/route.ts`
- Use `createServerClient()` from `src/lib/supabase/server.ts` for auth
- Remember `pdf-parse` only works server-side

### Modify auth flow
- Update protected/public routes in `middleware.ts` (see `publicPaths`)
- Redirect logic is in middleware; avoid redundant auth checks in pages

## Testing & Linting

Currently no Jest tests configured. Run linter before committing:
```bash
npm run lint
```

ESLint config extends `next/core-web-vitals` and `next/typescript`.
