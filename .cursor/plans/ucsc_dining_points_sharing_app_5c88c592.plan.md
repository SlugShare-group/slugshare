---
name: UCSC Dining Points Sharing App (Bare Minimum MVP)
overview: "Build a minimal MVP Next.js app for UCSC students to share dining hall points. Core features only: Google OAuth login, points balance, create requests, view requests, accept/decline donations. Everything else can be added later."
todos:
  - id: setup
    content: "✅ COMPLETE - Project initialized with Next.js, TypeScript, Tailwind, Prisma, NextAuth"
    status: completed
  - id: database_base
    content: "✅ COMPLETE - NextAuth tables (User, Account, Session, VerificationToken) exist"
    status: completed
  - id: database_models
    content: "Add Points and Request models to Prisma schema and run migration"
    status: pending
    dependencies:
      - database_base
  - id: auth_google
    content: "Add Google OAuth provider to NextAuth (currently only has Credentials provider)"
    status: pending
    dependencies:
      - database_base
  - id: points
    content: "Create points API endpoint and update dashboard to show balance"
    status: pending
    dependencies:
      - database_models
      - auth_google
  - id: requests
    content: "Create request system: form to create requests, page to list all requests"
    status: pending
    dependencies:
      - points
  - id: donations
    content: "Add accept/decline functionality to requests, implement point transfer logic"
    status: pending
    dependencies:
      - requests
---

# UCSC Dining Points Sharing App - Bare Minimum MVP

## Architecture Overview

Minimal Next.js full-stack application with:

- **Frontend**: Next.js 16.1.1 with App Router, React components, Tailwind CSS v4
- **Backend**: Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (beta) - currently Credentials provider, needs Google OAuth
- **UI Components**: shadcn/ui
- **Updates**: Manual refresh (no polling, no WebSockets - simplest possible)

## Current Repository State

### ✅ Already Implemented

1. **Project Setup**
   - ✅ Next.js 16.1.1 with TypeScript
   - ✅ Tailwind CSS v4 configured
   - ✅ Prisma with PostgreSQL configured
   - ✅ NextAuth.js v5 (beta) installed and configured
   - ✅ shadcn/ui components set up

2. **Authentication Infrastructure**
   - ✅ NextAuth.js with Prisma adapter
   - ✅ Credentials provider (email/password) working
   - ✅ Login page at `/auth/login`
   - ✅ Signup page at `/auth/signup`
   - ✅ Dashboard page at `/dashboard` (protected)
   - ✅ Session management working
   - ✅ `auth.ts` - NextAuth configuration
   - ✅ `auth.config.ts` - Auth config with Credentials provider
   - ✅ `lib/auth.ts` - Auth utilities (`getCurrentUser()` helper)
   - ✅ `lib/prisma.ts` - Prisma client
   - ✅ `app/api/auth/[...nextauth]/route.ts` - Auth API route

3. **Database**
   - ✅ PostgreSQL connection configured
   - ✅ NextAuth tables created (User, Account, Session, VerificationToken)
   - ✅ Migrations run successfully

### ❌ Still Needed for MVP

1. **Google OAuth Provider** ⚠️ HIGH PRIORITY
   - Add Google provider to `auth.config.ts`
   - Set up Google OAuth credentials in `.env`
   - (Optional) Update login page to include Google sign-in button

2. **Database Models** ⚠️ HIGH PRIORITY
   - Add `Points` model to Prisma schema
   - Add `Request` model to Prisma schema
   - Update `User` model to include relations
   - Run migration: `npx prisma migrate dev --name add_points_and_requests`

3. **Points Feature**
   - Create `app/api/points/route.ts` (GET and POST)
   - Update `app/dashboard/page.tsx` to show points balance
   - Allow users to set/update balance

4. **Requests Feature**
   - Create `app/requests/create/page.tsx` (form)
   - Create `app/requests/page.tsx` (list all requests)
   - Create `app/api/requests/route.ts` (GET all, POST create)

5. **Donations Feature**
   - Create `app/api/requests/[id]/accept/route.ts`
   - Create `app/api/requests/[id]/decline/route.ts`
   - Implement point transfer logic with database transactions

## Database Schema (Minimal MVP)

### Core Tables Only

- `users`: Managed by NextAuth.js (id, email, name, image from Google)
- `points`: id, user_id, balance (integer), updated_at
  - Simple: one row per user, balance can be manually set initially
- `requests`: id, requester_id, donor_id (nullable), location (string), points_requested (integer), status (pending/accepted/declined), message (optional text), created_at, updated_at

**Removed for MVP** (can add later):

- ❌ Projections table
- ❌ Transactions table
- ❌ Contact info fields

## Implementation Structure (MVP Only)

### 1. Project Setup

- Initialize Next.js project with TypeScript
- Set up Prisma with SQLite
- Configure Tailwind CSS
- Install NextAuth.js for Google OAuth
- No polling, no WebSockets - just basic pages

### 2. Database & Models

- **Files**: `prisma/schema.prisma`
- Create minimal schema: users (NextAuth), points, requests
- Set up migrations
- No seed data needed for MVP

### 3. Authentication System

- **Files**: `app/api/auth/[...nextauth]/route.ts`, `lib/auth.ts`
- Configure NextAuth.js with Google OAuth provider
- Set up Google OAuth credentials (from Google Cloud Console)
- Protected route middleware using NextAuth session
- Simple login page with "Sign in with Google" button

### 4. Core Features (MVP Only)

#### 4.1 Points Balance

- **Files**: `app/dashboard/page.tsx`, `app/api/points/route.ts`, `app/api/points/update/route.ts`
- Display current balance on dashboard
- Simple API to get/update balance (users can manually set initial balance)
- No transaction history, no projections - just a number

#### 4.2 Request System

- **Files**: `app/requests/create/page.tsx`, `app/requests/page.tsx`, `app/api/requests/route.ts`
- **Create Request Form**:
  - Location input (text field or simple dropdown: C9/C10, Oakes Cafe, etc.)
  - Points amount input
  - Optional message field
- **Requests List Page**:
  - Show all pending requests
  - Show request status (pending/accepted/declined)
  - Simple card layout
  - Manual refresh button (no auto-polling)

#### 4.3 Donation System

- **Files**: `app/api/requests/[id]/accept/route.ts`, `app/api/requests/[id]/decline/route.ts`
- Accept button on request cards (only for pending requests)
- Decline button on request cards
- On accept:
  - Transfer points: `donor.balance -= points_requested`, `requester.balance += points_requested`
  - Update request status to "accepted"
  - Set donor_id on request
- On decline: Update request status to "declined"

### 5. UI Components (Minimal)

- **Files**: `components/Navbar.tsx`, `components/RequestCard.tsx`
- Navbar: Show user name/image, logout button
- RequestCard: Display location, points, requester name, status, accept/decline buttons
- Basic Tailwind styling - functional, not polished

### 6. UCSC Locations

- **Files**: `lib/locations.ts` (optional - can be hardcoded in form)
- Simple array: `["C9/C10 Dining Hall", "Oakes Cafe", "Other"]`
- Or just a text input field for MVP

## Data Flow (MVP)

```mermaid
flowchart TD
    User[User] -->|Google OAuth| Auth[NextAuth Google]
    Auth -->|Session| Dashboard[Dashboard]
    
    Dashboard -->|View| Points[Points Balance]
    Dashboard -->|Create| Request[Create Request]
    
    Request -->|Submit| CreateAPI[API: Create Request]
    CreateAPI -->|Store| DB[(Database)]
    
    Dashboard -->|View| RequestsList[All Requests Page]
    RequestsList -->|Fetch| RequestsAPI[API: Get Requests]
    RequestsAPI -->|Query| DB
    
    RequestsList -->|Click Accept| AcceptAPI[API: Accept Request]
    AcceptAPI -->|Transfer Points| DB
    AcceptAPI -->|Update Status| DB
    
    RequestsList -->|Click Decline| DeclineAPI[API: Decline Request]
    DeclineAPI -->|Update Status| DB
```

## Key Implementation Details (MVP)

1. **Points Balance**:

   - Simple integer field in database
   - Users can manually set initial balance via API or form
   - No transaction history - just current balance
   - Can add history/projections later

2. **Request Flow**:

   - Any logged-in user can create a request
   - All requests visible to all users (potential donors)
   - First user to click "Accept" gets it
   - No filtering, no search - just a simple list

3. **Point Transfer**:

   - On accept: Atomic update of both balances in database transaction
   - Validate donor has enough points before transfer
   - Update request status and donor_id

4. **Security**:

   - NextAuth.js handles OAuth security
   - Protected API routes check NextAuth session
   - Input validation on forms
   - SQL injection prevention via Prisma

5. **No Auto-Updates**:

   - Users manually refresh page to see new requests/updates
   - Simplest possible - no polling, no WebSockets
   - Can add auto-refresh later if needed

## File Structure (MVP)

```
slugshare/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── points/route.ts (GET, POST to update balance)
│   │   ├── requests/route.ts (GET all, POST create)
│   │   └── requests/[id]/
│   │       ├── accept/route.ts
│   │       └── decline/route.ts
│   ├── dashboard/page.tsx (show balance, link to requests)
│   ├── requests/
│   │   ├── page.tsx (list all requests)
│   │   └── create/page.tsx (create request form)
│   ├── layout.tsx
│   └── page.tsx (home/landing page with login)
├── components/
│   ├── Navbar.tsx
│   └── RequestCard.tsx
├── lib/
│   ├── db.ts (Prisma client)
│   ├── auth.ts (NextAuth config)
│   └── locations.ts (optional - simple array)
├── prisma/
│   └── schema.prisma
├── types/
│   └── index.ts
└── package.json
```

## Development Phases (MVP)

1. **Phase 1**: Project setup, database schema, NextAuth.js with Google OAuth
2. **Phase 2**: Points balance API and dashboard display
3. **Phase 3**: Create requests form and list all requests page
4. **Phase 4**: Accept/decline functionality with point transfers
5. **Phase 5**: Basic styling and testing

## MVP Scope - What's Included

✅ **Core Features**:

- Google OAuth login
- Points balance (manual set/update)
- Create requests (location, points, message)
- View all requests
- Accept/decline requests
- Point transfer on accept

❌ **Deferred for Later** (can build on top of MVP):

- Point projections/forecasting
- Contact information sharing
- Transaction history
- Auto-refresh/polling
- Request filtering/search
- Email notifications
- Profile pages
- Advanced UI polish

## MVP Simplifications

- ✅ **Google OAuth only**: No email/password (NextAuth.js makes this easy)
- ✅ **SQLite**: No external database setup
- ✅ **No auto-updates**: Manual page refresh
- ✅ **Minimal schema**: 3 tables only (users, points, requests)
- ✅ **No projections**: Just balance tracking
- ✅ **No contact info**: Can add later
- ✅ **Simple UI**: Functional, not polished

This MVP can be built in ~2-3 days and provides a solid foundation to build upon.

---

# Detailed Setup & Implementation Guide

## Prerequisites

Before starting, make sure everyone has:

- Node.js 18+ installed ([download here](https://nodejs.org/))
- A code editor (VS Code recommended)
- A Google account (for OAuth setup)
- Git installed (for version control)

## Step 1: Repository Setup (Already Done ✅)

The repository is already initialized with:
- Next.js 16.1.1
- TypeScript
- Tailwind CSS v4
- Prisma with PostgreSQL
- NextAuth.js v5 (beta)
- shadcn/ui components

### 1.1 Install Dependencies

If you haven't already, install dependencies:

```bash
npm install
```

This will install all packages and run `prisma generate` automatically (via postinstall script).

### 1.2 Set Up Environment Variables

Create a `.env` file in the root directory (if it doesn't exist):

```env
# Database - PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/slugshare"

# NextAuth.js Secret (required)
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-key-here"

# Google OAuth (we'll add these next)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

**Note:** The repo uses `AUTH_SECRET` (not `NEXTAUTH_SECRET`) for NextAuth v5.

**Getting your DATABASE_URL:**

**If using Supabase:**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database
4. Copy the "Connection string" (URI format)
5. Replace `[YOUR-PASSWORD]` with your database password

**If using Neon:**
1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy the connection string from dashboard

**If using local PostgreSQL:**
- Format: `postgresql://postgres:YOUR_PASSWORD@localhost:5432/slugshare`
- Replace `YOUR_PASSWORD` with your PostgreSQL password

## Step 2: Database Schema Setup

### 2.1 Add Points and Request Models to Prisma Schema

The schema already has NextAuth models. We need to add the Points and Request models.

Open `prisma/schema.prisma` and add these models after the existing `VerificationToken` model:

```prisma
// Points model - one row per user
model Points {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Int      @default(0)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  updatedAt DateTime @updatedAt
}

// Request model
model Request {
  id             String   @id @default(cuid())
  requesterId    String
  donorId        String?
  location       String
  pointsRequested Int
  status         String   @default("pending") // pending, accepted, declined
  message        String?
  requester      User     @relation("Requester", fields: [requesterId], references: [id])
  donor          User?    @relation("Donor", fields: [donorId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

Then, update the `User` model to include the relations. Add these lines to the existing `User` model:

```prisma
model User {
  // ... existing fields ...
  accounts      Account[]
  sessions      Session[]
  points        Points?              // Add this
  requests      Request[] @relation("Requester")  // Add this
  donations     Request[] @relation("Donor")     // Add this
}

// NextAuth.js required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Points model - one row per user
model Points {
  id        String   @id @default(cuid())
  userId    String   @unique
  balance   Int      @default(0)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  updatedAt DateTime @updatedAt
}

// Request model
model Request {
  id             String   @id @default(cuid())
  requesterId    String
  donorId        String?
  location       String
  pointsRequested Int
  status         String   @default("pending") // pending, accepted, declined
  message        String?
  requester      User     @relation("Requester", fields: [requesterId], references: [id])
  donor          User?    @relation("Donor", fields: [donorId], references: [id])
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Key concepts:**

- `@id @default(cuid())`: Unique identifier
- `@unique`: Ensures no duplicates
- `@relation`: Links tables together
- `onDelete: Cascade`: Deletes related records when parent is deleted

### 2.2 Run Migration to Add New Tables

After adding the Points and Request models, run the migration:

```bash
npx prisma migrate dev --name add_points_and_requests
```

This creates:
- Points and Request tables in your PostgreSQL database
- Migration files in `prisma/migrations/`

**Note:** Make sure your `DATABASE_URL` in `.env` is correct before running migrations!

### 2.3 Generate Prisma Client

```bash
npx prisma generate
```

This generates TypeScript types for your database models (including the new Points and Request models).

## Step 3: Add Google OAuth Provider

### 3.1 Get Google OAuth Credentials

### 3.2 Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Google+ API:

   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

4. Create OAuth credentials:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "SlugShare" (or any name)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click "Create"

5. Copy the Client ID and Client Secret
6. Add them to your `.env` file:
   ```env
   GOOGLE_CLIENT_ID="your-client-id-here"
   GOOGLE_CLIENT_SECRET="your-client-secret-here"
   ```


## Step 4: Add Google Provider to Auth Config

The repository already has:
- ✅ `auth.ts` - NextAuth configuration with Prisma adapter
- ✅ `auth.config.ts` - Auth config with Credentials provider
- ✅ `app/api/auth/[...nextauth]/route.ts` - Auth API route
- ✅ `lib/prisma.ts` - Prisma client

**What we need to do:** Add Google OAuth provider to the existing `auth.config.ts`.

Update `auth.config.ts`:

```typescript
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";  // Add this import
import { prisma } from "@/lib/prisma";

export const authConfig = {
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn && (nextUrl.pathname === "/auth/login" || nextUrl.pathname === "/auth/signup")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [
    Google({  // Add Google provider BEFORE Credentials
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      // ... keep existing Credentials provider ...
    }),
  ],
} satisfies NextAuthConfig;
```

**Note:** The Prisma adapter is already configured in `auth.ts`, so Google OAuth will automatically work with the database.

## Step 5: Update Login Page (Optional)

The login page at `app/auth/login/page.tsx` currently has Credentials login. You can add a "Sign in with Google" button.

You can add it to the existing login form, or create a separate button. For NextAuth v5, use:

```typescript
import { signIn } from "@/auth"

// In a Server Action:
await signIn("google", { redirectTo: "/dashboard" })
```

Or in a client component:

```typescript
'use client'
import { signIn } from "next-auth/react"

<button onClick={() => signIn("google")}>
  Sign in with Google
</button>
```

**Note:** The home page (`app/page.tsx`) currently redirects to `/auth/login`. You may want to update it to show a landing page with Google sign-in option.

## Step 6: Current Pages (Already Exist ✅)

The following pages already exist:

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { signIn } from "next-auth/react"
import SignInButton from "@/components/SignInButton"

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">SlugShare</h1>
        <p className="text-gray-600 mb-8">Share dining hall points at UCSC</p>
        <SignInButton />
      </div>
    </div>
  )
}
```

Create `components/SignInButton.tsx`:

```typescript
'use client'

import { signIn } from "next-auth/react"

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn('google')}
      className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
    >
      Sign in with Google
    </button>
  )
}
```

- ✅ `app/auth/login/page.tsx` - Login page
- ✅ `app/auth/signup/page.tsx` - Signup page  
- ✅ `app/dashboard/page.tsx` - Dashboard (protected)
- ✅ `app/page.tsx` - Home page (redirects to login)

The dashboard currently shows user email and name. We'll update it to show points balance.

## Step 7: Implementation Tasks for Your Group

Now that setup is complete, here are the features to implement:

### Task 1: Points API (GET and UPDATE)
**File:** `app/api/points/route.ts`

**Requirements:**
- GET: Return current user's points balance (create Points record if doesn't exist)
- POST: Update current user's points balance
- Protect routes (check session using `getCurrentUser()` from `lib/auth.ts`)
- Validate input (balance must be >= 0)

**Hints:**
- Use `getCurrentUser()` from `lib/auth.ts` to get current user
- Use `prisma` from `lib/prisma.ts` to query/update database
- Return JSON responses
- Use `prisma.points.upsert()` to get or create points record

### Task 2: Update Dashboard to Show Points
**File:** `app/dashboard/page.tsx`

**Requirements:**
- Display current points balance
- Show links to create request and view requests
- Get or create Points record for user on page load

**Hints:**
- Use `getCurrentUser()` to get user
- Use `prisma.points.findUnique()` or `upsert()` to get points
- Update the existing dashboard page (it already shows user info)

### Task 3: Create Request Form
**File:** `app/requests/create/page.tsx`

**Requirements:**
- Form with fields: location (dropdown or text), points (number), message (optional)
- Submit to `/api/requests` POST endpoint
- Show success/error messages
- Redirect to requests list after creation

**Hints:**
- Use `'use client'` for form handling
- Use `fetch()` to call API
- Use Next.js `useRouter()` for navigation
- Use shadcn/ui components (Button, Input, Card) that are already installed

### Task 4: Requests API
**File:** `app/api/requests/route.ts`

**Requirements:**
- GET: Return all requests (with requester info)
- POST: Create new request
- Protect routes
- Validate input

**Hints:**
- Use Prisma `include` to get related user data: `include: { requester: { select: { name, email } } }`
- Sort by `createdAt` descending (newest first)
- Use `getCurrentUser()` to get requester ID

### Task 5: Requests List Page
**File:** `app/requests/page.tsx`

**Requirements:**
- Display all requests in cards
- Show: location, points, requester name, status, message
- Show accept/decline buttons (only for pending requests, not user's own requests)
- Don't show user's own requests (or show them differently)

**Hints:**
- Fetch from `/api/requests`
- Use `'use client'` for interactivity
- Style with Tailwind CSS and shadcn/ui Card component
- Filter out user's own requests or mark them differently

### Task 6: Accept/Decline API
**Files:** 
- `app/api/requests/[id]/accept/route.ts`
- `app/api/requests/[id]/decline/route.ts`

**Requirements:**
- Accept: Transfer points, update request status, set donor_id
- Decline: Update request status
- Validate: Donor has enough points, request is pending, user is not requester
- Use database transactions for atomicity

**Hints:**
- Use Prisma `$transaction()` for atomic updates
- Check `request.status === 'pending'`
- Check `donor.balance >= request.pointsRequested`
- Update both Points records in the same transaction

### Task 7: Update Points Balance on Accept
When a request is accepted:
1. Decrease donor's balance
2. Increase requester's balance
3. Update request status to "accepted"
4. Set donor_id on request
5. All in one database transaction

**Example transaction:**
```typescript
await prisma.$transaction([
  prisma.points.update({ where: { userId: donorId }, data: { balance: { decrement: points } } }),
  prisma.points.update({ where: { userId: requesterId }, data: { balance: { increment: points } } }),
  prisma.request.update({ where: { id: requestId }, data: { status: 'accepted', donorId } })
])
```

## Step 8: Testing Your Implementation

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/')
  }

  // Get or create user's points
  let points = await db.points.findUnique({
    where: { userId: session.user.id }
  })

  if (!points) {
    points = await db.points.create({
      data: {
        userId: session.user.id,
        balance: 0
      }
    })
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Your Points Balance</h2>
        <p className="text-4xl font-bold text-blue-600">{points.balance}</p>
      </div>

      <div className="flex gap-4">
        <Link 
          href="/requests/create"
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
        >
          Create Request
        </Link>
        <Link 
          href="/requests"
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
        >
          View All Requests
        </Link>
      </div>
    </div>
  )
}
```

## Step 9: Implementation Tasks for Your Group

Now that setup is complete, here are the features to implement:

### Task 1: Points API (GET and UPDATE)

**File:** `app/api/points/route.ts`

**Requirements:**

- GET: Return current user's points balance
- POST: Update current user's points balance
- Protect routes (check session)
- Validate input (balance must be >= 0)

**Hints:**

- Use `getServerSession(authOptions)` to get current user
- Use Prisma to query/update database
- Return JSON responses

### Task 2: Create Request Form

**File:** `app/requests/create/page.tsx`

**Requirements:**

- Form with fields: location (dropdown or text), points (number), message (optional)
- Submit to `/api/requests` POST endpoint
- Show success/error messages
- Redirect to requests list after creation

**Hints:**

- Use `'use client'` for form handling
- Use `fetch()` to call API
- Use Next.js `useRouter()` for navigation

### Task 3: Requests API

**File:** `app/api/requests/route.ts`

**Requirements:**

- GET: Return all requests (with requester info)
- POST: Create new request
- Protect routes
- Validate input

**Hints:**

- Use Prisma `include` to get related user data
- Sort by `createdAt` descending (newest first)

### Task 4: Requests List Page

**File:** `app/requests/page.tsx`

**Requirements:**

- Display all requests in cards
- Show: location, points, requester name, status, message
- Show accept/decline buttons (only for pending requests)
- Don't show user's own requests (or show them differently)

**Hints:**

- Fetch from `/api/requests`
- Use `'use client'` for interactivity
- Style with Tailwind CSS

### Task 5: Accept/Decline API

**Files:**

- `app/api/requests/[id]/accept/route.ts`
- `app/api/requests/[id]/decline/route.ts`

**Requirements:**

- Accept: Transfer points, update request status, set donor_id
- Decline: Update request status
- Validate: Donor has enough points, request is pending
- Use database transactions for atomicity

**Hints:**

- Use Prisma `$transaction()` for atomic updates
- Check `request.status === 'pending'`
- Check `donor.balance >= request.pointsRequested`

### Task 6: Update Points Balance on Accept

When a request is accepted:

1. Decrease donor's balance
2. Increase requester's balance
3. Update request status
4. All in one database transaction

## Step 10: Testing Your Implementation

### Test Cases:

1. **Authentication:**

   - ✅ Can sign in with Google
   - ✅ Can sign out
   - ✅ Protected pages redirect to login

2. **Points:**

   - ✅ Can view points balance
   - ✅ Can update points balance
   - ✅ Balance can't go negative

3. **Requests:**

   - ✅ Can create a request
   - ✅ Can view all requests
   - ✅ Can't see own requests (or they're marked differently)
   - ✅ Can accept a request (if has enough points)
   - ✅ Can decline a request
   - ✅ Points transfer correctly on accept
   - ✅ Can't accept already accepted/declined requests

## Common Issues & Solutions

### Issue: "Module not found" errors

**Solution:** Make sure you've run `npm install` and `npx prisma generate`

### Issue: Database errors

**Solution:** Run `npx prisma migrate dev` to ensure schema is up to date

### Issue: Google OAuth not working

**Solution:**

- Check `.env` file has correct credentials
- Make sure redirect URI in Google Console matches exactly
- Check `NEXTAUTH_URL` is correct

### Issue: TypeScript errors

**Solution:**

- Run `npx prisma generate` after schema changes
- Restart your TypeScript server in VS Code

## Next Steps After MVP

Once MVP is working, you can add:

- Point projections feature
- Contact information sharing
- Transaction history
- Auto-refresh/polling
- Better UI/UX
- Request filtering
- Email notifications

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

Good luck with your implementation!