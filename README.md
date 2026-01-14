# SlugShare Web Server

A Next.js application with authentication, built with NextAuth.js, Prisma, and shadcn/ui.

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
- Create the database schema (User, Account, Session, VerificationToken tables)
- Generate the Prisma Client

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
│   ├── dashboard/          # Protected dashboard page
│   ├── actions/            # Server actions
│   └── api/                # API routes
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── providers.tsx       # Session provider
├── lib/
│   ├── auth.ts             # Auth utilities
│   ├── prisma.ts           # Prisma client
│   └── utils.ts            # Utility functions
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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma migrate dev` - Run database migrations
- `npx prisma studio` - Open Prisma Studio (database GUI)

## Authentication

The application uses NextAuth.js with:

- **Credentials Provider** - Email/password authentication
- **Prisma Adapter** - Stores sessions and accounts in the database
- **JWT Sessions** - Token-based session management

### Authentication Routes

- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/auth/*` - NextAuth.js API routes

## Database Schema

The Prisma schema includes:

- **User** - User accounts
- **Account** - OAuth account connections
- **Session** - User sessions
- **VerificationToken** - Email verification tokens

## Getting Help

If you need help setting up the project, please contact the project maintainer with:

1. Your Node.js version (`node --version`)
2. Your database setup (local PostgreSQL, cloud provider, etc.)
3. Any error messages you're encountering

## Notes

- The `.env` file is gitignored - never commit it to version control
- Make sure your database is running before starting the development server
- The `AUTH_SECRET` should be a long, random string (at least 32 characters)
- For production, use a secure database connection with SSL enabled
