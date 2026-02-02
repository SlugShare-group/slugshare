# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SlugShare is a Next.js application for sharing dining hall points at UCSC. Users can create requests for dining points at specific locations, and other users can accept those requests, transferring points between accounts.

**Tech Stack:**
- Next.js 16.1.1 with App Router
- NextAuth.js v5 (beta) for authentication
- PostgreSQL database with Prisma ORM
- shadcn/ui components with Tailwind CSS v4
- TypeScript
- Vitest for testing

## Common Commands

### Development
```bash
npm run dev                    # Start development server (http://localhost:3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

### Testing
```bash
npm test                       # Run Vitest in watch mode
npm run test:run              # Run Vitest once
```

### Database
```bash
npx prisma migrate dev         # Run migrations (creates/updates schema)
npx prisma generate            # Generate Prisma Client (run after schema changes)
npx prisma studio              # Open Prisma Studio GUI to view/edit data
npx prisma db push             # Push schema changes without creating migration
```

**Important:** Always run `npx prisma generate` after modifying `prisma/schema.prisma` to update TypeScript types.

## Architecture

### Authentication Flow

The app uses NextAuth.js v5 with a JWT session strategy and Prisma adapter:

1. **Auth Configuration** (`auth.config.ts`): Defines providers (Google OAuth, Credentials), callbacks, and page routes
2. **Auth Instance** (`auth.ts`): Creates NextAuth instance with PrismaAdapter
3. **Auth Helper** (`lib/auth.ts`): Exports `getCurrentUser()` for server-side authentication checks
4. **Protected Routes**: Use `getCurrentUser()` in API routes and Server Components to verify authentication

**Key Pattern:**
```typescript
const user = await getCurrentUser();
if (!user || !user.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Database Schema

Three custom models beyond NextAuth tables:

- **Points**: One-to-one with User, tracks dining points balance
- **Request**: Tracks point-sharing requests with status (pending/accepted/declined)
- **User Relations**: User has one `points`, many `requests` (as requester), many `donations` (as donor)

### Points Transfer System

Point transfers use Prisma transactions for atomicity in `app/api/requests/[id]/accept/route.ts`:

1. Validate request status, donor balance, and ownership
2. Execute atomic transaction:
   - Decrement donor's points balance
   - Increment requester's points balance
   - Update request status to "accepted" and set donorId

**Critical:** Always use `prisma.$transaction([...])` for operations that modify multiple records to ensure data consistency.

### Validation Layer

Validation logic is centralized in `lib/validation.ts` with reusable functions:
- `validateCreateRequest()`: Validates location and points
- `validateAcceptRequest()`: Validates request status, ownership, and balance
- `validateDeleteRequest()`: Validates request deletion permissions

Each returns `{ valid: true }` or `{ valid: false; error: string; status: number }`.

### API Route Pattern

All API routes follow this pattern:
1. Get current user with `getCurrentUser()`
2. Return 401 if not authenticated
3. Validate request data using `lib/validation.ts` functions
4. Use `prisma.points.upsert()` to get-or-create Points records (prevents errors when points don't exist)
5. Perform database operations
6. Return JSON response with appropriate status code

### Client-Side State Management

The app uses React Server Components where possible. Client components (marked with `'use client'`) handle:
- Forms and user input
- Interactive UI elements (buttons, dropdowns)
- API calls with `fetch()`

No global state management library is used. Server Components fetch fresh data on each request.

### UCSC Locations

Dining hall locations are defined in `lib/locations.ts` as a const array with TypeScript type. Use this constant in forms and validation to ensure consistency.

## Key Files

- `auth.config.ts` - NextAuth providers and callbacks
- `auth.ts` - NextAuth instance with Prisma adapter
- `lib/auth.ts` - Server-side auth helper (`getCurrentUser()`)
- `lib/prisma.ts` - Prisma client singleton
- `lib/validation.ts` - Request validation functions
- `lib/locations.ts` - UCSC dining locations constant
- `prisma/schema.prisma` - Database schema

## Environment Variables

Required in `.env`:
```env
DATABASE_URL="postgresql://..."           # PostgreSQL connection string
AUTH_SECRET="..."                         # NextAuth secret (generate with: openssl rand -base64 32)
GOOGLE_CLIENT_ID="..."                   # Google OAuth client ID
GOOGLE_CLIENT_SECRET="..."               # Google OAuth client secret
```

## Testing

Tests use Vitest with jsdom environment. Test files use `.test.ts` or `.test.tsx` extension.

Current test coverage focuses on validation logic (`__tests__/validation.test.ts`).

When adding tests:
- Place in `__tests__/` directory
- Use `describe()` and `it()` blocks
- Import from `vitest` (not jest)
- Mock Prisma with `vi.mock('@/lib/prisma')`

## Development Workflow

1. **Schema Changes**: Edit `prisma/schema.prisma` → Run `npx prisma migrate dev` → Run `npx prisma generate`
2. **New Features**: Create API route → Add validation → Update UI component → Test manually
3. **Auth Changes**: Modify `auth.config.ts` → Restart dev server (auth config is cached)

## Important Patterns

### Upsert Pattern for Points
Always use `upsert` to handle cases where a user's Points record doesn't exist:
```typescript
const points = await prisma.points.upsert({
  where: { userId: user.id },
  update: {},
  create: { userId: user.id, balance: 0 },
});
```

### Request Queries with Relations
Include related user data when fetching requests:
```typescript
const requests = await prisma.request.findMany({
  include: {
    requester: { select: { name: true, email: true, image: true } },
    donor: { select: { name: true } },
  },
});
```

### Error Handling in API Routes
Use try-catch blocks and return appropriate status codes:
```typescript
try {
  // ... operation
  return NextResponse.json({ success: true });
} catch (error) {
  console.error("Error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

## Common Gotchas

- NextAuth v5 uses `AUTH_SECRET` (not `NEXTAUTH_SECRET`)
- `params` in dynamic routes are now async in Next.js 16: `const { id } = await params`
- Prisma Client must be regenerated after schema changes
- JWT sessions don't automatically update - user info is cached in the token
- Points records don't exist by default - always use upsert to handle first access
