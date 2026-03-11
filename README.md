[![CI](https://github.com/SlugShare-group/slugshare/actions/workflows/ci.yml/badge.svg)](https://github.com/SlugShare-group/slugshare/actions/workflows/ci.yml)
# SlugShare - UCSC Dining Points Sharing App

A Next.js application for sharing dining hall points at UCSC, built with NextAuth.js, Prisma, and shadcn/ui.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** database (or access to a PostgreSQL database)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `webserver` directory with the following variables:

**Required Environment Variables:**

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/database_name?sslmode=require"

# NextAuth.js Secret
# Generate a secret with: openssl rand -base64 32
AUTH_SECRET="your-secret-key-here"

# Google OAuth (for Google sign-in)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Optional Environment Variables:**

```env
# Prisma Accelerate (if using)
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=your_api_key"

# Alternative PostgreSQL URL (if needed)
POSTGRES_URL="postgresql://user:password@localhost:5432/database_name?sslmode=require"
```

### 4. Generate AUTH_SECRET

If you need to generate a new `AUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

Copy the output and add it to your `.env` file.

### 5. Database Setup

#### Using an Existing Database

If you have a database connection string, add it to your `.env` file as `DATABASE_URL`.

### 6. Run Database Migrations

After setting up your database, run Prisma migrations:

```bash
npx prisma migrate dev
```

This will:
- Create the database schema (User, Account, Session, VerificationToken, Points, Request tables)
- Generate the Prisma Client

**Note:** After schema changes, always run `npx prisma generate` to update TypeScript types.

### 7. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
webserver/
├── app/
│   ├── auth/
│   │   ├── login/          # Login page
│   │   └── signup/         # Sign up page
│   ├── dashboard/          # Protected dashboard page (shows points balance)
│   ├── requests/
│   │   ├── page.tsx        # Requests list page
│   │   └── create/         # Create request page
│   ├── actions/            # Server actions
│   └── api/
│       ├── auth/           # NextAuth.js routes
│       ├── points/         # Points API (GET, POST)
│       ├── requests/        # Requests API (GET, POST)
│       │   └── [id]/
│       │       ├── accept/ # Accept request route
│       │       └── decline/# Decline request route
│       └── user/           # Current user API
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── providers.tsx       # Session provider
│   └── UpdatePointsForm.tsx # Points update form
├── lib/
│   ├── auth.ts             # Auth utilities
│   ├── prisma.ts           # Prisma client
│   ├── utils.ts            # Utility functions
│   └── locations.ts        # UCSC dining locations
├── prisma/
│   └── schema.prisma       # Database schema
└── .env                    # Environment variables (create this)
```

## Tech Stack

- **Framework:** Next.js 16.1.1 (App Router)
- **Authentication:** NextAuth.js v5 (beta)
- **Database:** PostgreSQL with Prisma ORM
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS v4
- **TypeScript:** v5

## GET Integration Diagrams

### 1) GET Login / Account Linking Flow

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (GET Connect UI)
  participant API as /api/get/connect
  participant Parse as extractValidatedSessionId
  participant GA as GET Adapter
  participant DB as Prisma GetCredential

  U->>FE: Paste validated GET URL/input
  FE->>API: POST validatedInput
  API->>Parse: Extract validated GET sessionId
  Parse-->>API: validatedSessionId

  API->>GA: generateDeviceId() + generatePin()
  API->>GA: createPin(validatedSessionId, deviceId, pin)
  API->>GA: authenticatePin(pin, deviceId)
  GA-->>API: apiSessionId
  API->>GA: verifyPin(apiSessionId, deviceId, pin)
  API->>GA: retrieveAccounts(apiSessionId)

  API->>DB: upsert deviceId + encryptedPin + linked metadata
  API-->>FE: linked=true, status=linked
```

### 2) QR Code Generation + GET Token / Device / PIN Handling

```mermaid
sequenceDiagram
  participant FE as Frontend (Scan / Pull QR)
  participant API as /api/get/pull-qr or /api/get/barcode
  participant Server as getActiveGetSessionForUser
  participant DB as Prisma GetCredential
  participant Crypto as decryptSecret
  participant GA as GET Adapter
  participant GET as External GET API

  FE->>API: Request QR payload
  API->>DB: Load linked credential (deviceId, encryptedPin)
  DB-->>API: linked credential

  API->>Server: getActiveGetSessionForUser(userId)
  Server->>Crypto: decrypt encryptedPin -> pin
  Server->>GA: authenticatePin(pin, deviceId)
  GA->>GET: authenticateWithPin(...)
  GET-->>GA: sessionId (short-lived token)
  Server->>GA: verifyPin(sessionId, deviceId, pin)
  Server->>DB: Update lastValidatedAt/status

  API->>GA: retrieveBarcodePayload(sessionId, ...)
  GA->>GET: barcode method with sessionId
  GET-->>GA: barcode payload + expiry
  API-->>FE: payload for PDF417 rendering

  Note over API,DB: deviceId + encryptedPin are persisted
  Note over API,FE: session token is obtained server-side per request and never exposed as stored client secret
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma migrate dev` - Run database migrations
- `npx prisma generate` - Generate Prisma Client (run after schema changes)
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Features

### Authentication
- **Credentials Provider** - Email/password authentication
- **Google OAuth Provider** - Sign in with Google
- **Prisma Adapter** - Stores sessions and accounts in the database
- **JWT Sessions** - Token-based session management

### Points Management
- View current points balance on dashboard
- Update points balance manually
- Automatic points record creation on first access

### Request System
- Create requests for dining points (location, amount, optional message)
- View all requests from other users
- View your own requests with status tracking
- Accept or decline requests from other users

### Point Transfers
- Atomic point transfers when accepting requests
- Validation: sufficient balance, pending status, prevent self-acceptance
- Automatic balance updates for both donor and requester

## Routes

### Pages
- `/` - Home page (redirects to login)
- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/dashboard` - Protected dashboard (shows points balance)
- `/requests` - All requests page (My Requests + Other Requests)
- `/requests/create` - Create new request page

### API Routes
- `/api/auth/*` - NextAuth.js authentication routes
- `/api/points` - GET (fetch balance), POST (update balance)
- `/api/requests` - GET (all requests), POST (create request)
- `/api/requests/[id]/accept` - POST (accept request and transfer points)
- `/api/requests/[id]/decline` - POST (decline request)
- `/api/user` - GET (current user info)

## Database Schema

The Prisma schema includes:

### NextAuth.js Models
- **User** - User accounts
- **Account** - OAuth account connections
- **Session** - User sessions
- **VerificationToken** - Email verification tokens

### Application Models
- **Points** - User point balances (one row per user)
- **Request** - Point sharing requests (requester, donor, location, status)

## Getting Help

If you need help setting up the project, please contact the project maintainer with:

1. Your Node.js version (`node --version`)
2. Your database setup (local PostgreSQL, cloud provider, etc.)
3. Any error messages you're encountering

## Google OAuth Setup

To enable Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API (APIs & Services > Library)
4. Create OAuth credentials (APIs & Services > Credentials)
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env` file

## Notes

- The `.env` file is gitignored - never commit it to version control
- Make sure your database is running before starting the development server
- The `AUTH_SECRET` should be a long, random string (at least 32 characters)
- For production, use a secure database connection with SSL enabled
- After modifying `prisma/schema.prisma`, run `npx prisma generate` to update TypeScript types
- Run `npx prisma migrate dev` after schema changes to apply migrations
