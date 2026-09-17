# JobCamp

A web application for managing career exploration events at high schools. Coordinates admins, host companies, and students through a structured job-shadow day process — from event creation and position signup through a lottery-based assignment system.

[![Tests](https://github.com/actions/workflows/test.yml/badge.svg)](/.github/workflows/test.yml)

## Overview

**Core flow:**

1. Admin creates an **Event** for their school
2. Host companies create **Positions** (job shadow slots)
3. Students browse positions and submit ranked **preference picks**
4. Admin runs the **Lottery** to assign students to positions
5. Results are published and students attend job shadow day

**User roles:**

- **Admins** — school staff who manage events, students, companies, and run the lottery
- **Hosts** — company representatives who create and manage job shadow positions
- **Students** — browse positions, submit preference picks, receive assignments

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit + Svelte 5 |
| Database | MySQL via Prisma ORM |
| Auth | Lucia v3 |
| Email | SendGrid |
| SMS | Twilio |
| Forms | sveltekit-superforms + Zod |
| Rich text | TipTap |
| UI | Bits UI + Lucide icons |
| Styling | Tailwind CSS v3 |
| Testing | Vitest + @testing-library/svelte |
| Runtime | Node.js via @sveltejs/adapter-node |
| Storage | Google Cloud Storage |

## Prerequisites

- Node.js 20+
- pnpm 8+
- MySQL database

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment variables (see below)

# Generate Prisma client
pnpm prisma generate

# Push schema to database (dev only)
pnpm prisma db push

# Start dev server
pnpm dev
```

The dev server runs on [http://localhost:34040](http://localhost:34040).

## Environment Variables

```bash
DATABASE_URL=                    # MySQL connection string
IS_PRODUCTION=false              # true enables real email/SMS delivery
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=admin@jobcamp.org
SENDGRID_FROM_NAME=JobCamp
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=             # E.164 format: +1XXXXXXXXXX
GCS_BUCKET_NAME=                 # Google Cloud Storage bucket for attachments
```

Restart the dev server after changing `.env`.

## Development Commands

```bash
pnpm dev              # dev server on port 34040
pnpm build            # production build
pnpm check            # svelte-check type checking
pnpm lint             # eslint
pnpm test:run         # run all tests once
pnpm test             # run tests in watch mode

# Run a single test file
pnpm vitest run tests/lottery.test.ts

# Prisma
pnpm prisma generate     # regenerate client after schema changes
pnpm prisma db push      # push schema to DB (dev/staging only)
pnpm prisma migrate dev  # create a migration
```

**Before every commit:** run `pnpm test:run` and `pnpm lint`.

## Project Structure

```
src/
  routes/
    login/                       # Student/host login
    admin/login/                 # Admin login
    signup/student/              # Student registration
    signup/company/              # Company/host registration
    dashboard/
      admin/                     # Admin dashboard (stats, overview)
      admin/data-mgmt/           # Bulk import/export, user management
      admin/event-mgmt/          # Event lifecycle management
      admin/archived/            # Archived events view
      student/                   # Student dashboard (current assignment)
      student/pick/              # Position preference picker
    lottery/                     # Lottery run & results
    messaging/                   # Bulk messaging UI
    visualizations/              # Charts and analytics
    permission-slip/             # Parent permission slip flow
    verify-email/                # Email verification
    [school]/                    # Public school landing page
    [school]/view-companies/     # Public company directory

  lib/server/
    prisma.ts                    # Prisma client singleton
    auth.ts                      # Lucia auth setup
    lottery.ts                   # Lottery algorithm
    messaging.ts                 # Unified message dispatcher
    sendgrid.ts                  # SendGrid integration
    twilio.ts                    # Twilio SMS integration
    email.ts                     # Transactional email functions
    eventManagement.ts           # Event lifecycle helpers
    gradeUtils.ts                # Grade year calculations

prisma/
  schema.prisma                  # Database schema

tests/                           # Integration and server-logic tests
```

## Data Model

```
School
├── Event (one active per school at a time)
│   ├── Position (created by Host/Company)
│   │   ├── PositionsOnStudents  (student preference picks, ranked)
│   │   └── LotteryResults       (final assignments)
│   └── StudentEventParticipation
├── Student
└── Company
    └── Host (linked to a User)
```

## Deployment

The app is containerized with Docker and deployed via GitHub Actions.

| Branch | Target | Dockerfile |
|---|---|---|
| `main` | Self-hosted production server | `production.Dockerfile` |
| `stage` | Google Cloud Run | `staging.Dockerfile` |

Images are built with `docker buildx --push` and pushed to GHCR. The production server pulls and restarts the container on new image tags.

## Testing

```bash
pnpm test:run       # run all tests once
pnpm test           # watch mode
pnpm test:ui        # Vitest UI
```

Tests live in `tests/` (integration/server logic) and `src/**/*.test.ts` (component/unit). CI runs tests on every push and PR to `main` and `stage`.
