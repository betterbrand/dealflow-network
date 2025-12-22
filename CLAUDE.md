# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev          # Start development server (TSX watch for server, Vite HMR for client)
npm run build        # Build for production (Vite for client, esbuild for server)
npm start            # Run production build
npm run check        # TypeScript type checking (no emit)
npm run format       # Format code with Prettier
npm run test         # Run Vitest tests
```

### Database
```bash
npm run db:push      # Generate and run Drizzle migrations
```

Database requires `DATABASE_URL` environment variable (MySQL connection string).

### Docker

The application supports Docker for both development and production environments.

**Development** (with hot module reloading):
```bash
docker-compose up              # Build and start development container
docker-compose up -d           # Start in detached mode
docker-compose down            # Stop and remove containers
docker-compose logs -f app     # Follow application logs
docker-compose exec app sh     # Access container shell
docker-compose exec app npm run db:push  # Run migrations in container
```

**Production**:
```bash
docker-compose -f docker-compose.prod.yml build  # Build production image
docker-compose -f docker-compose.prod.yml up     # Run production container
docker-compose -f docker-compose.prod.yml up -d  # Run in detached mode
```

**Requirements**:
- Copy `.env.example` to `.env` for development
- Copy `.env.example` to `.env.production` for production
- Ensure `DATABASE_URL` points to external MySQL database
- For production build, set all `VITE_*` variables in `.env.production` (they're baked into the frontend at build time)

**Development Workflow**:
1. Copy `.env.example` to `.env` and configure variables
2. Run `docker-compose up`
3. Edit source files - changes will hot reload automatically
4. Access app at `http://localhost:3000`

**Notes**:
- Development container mounts source directories as volumes for hot reload
- `node_modules` uses a named Docker volume to avoid host/container conflicts
- Production image uses multi-stage build for minimal size (~150MB)
- Health check endpoint: `/api/health`

## Architecture Overview

**Monorepo Structure**: Single repository with client-server separation, shared code, and unified TypeScript configuration.

**Stack**:
- Frontend: React 19 + Vite + Wouter (routing) + TanStack Query
- Backend: Express + tRPC + Drizzle ORM
- Database: MySQL
- UI: Radix UI components + Tailwind CSS v4
- Auth: Magic link (passwordless JWT-based)

### Directory Structure

```
client/               # React SPA
  src/
    _core/           # Core utilities and hooks (useAuth)
    components/      # Reusable components
      ui/           # Radix UI wrappers
    pages/          # Route-level page components
    lib/            # Client utilities (trpc.ts - tRPC client setup)
    contexts/       # React contexts
    App.tsx         # Main app with Wouter routing
    main.tsx        # Entry point with tRPC provider

server/              # Express + tRPC backend
  _core/            # Core server infrastructure
    index.ts        # Express server entry point
    context.ts      # tRPC context (user, req, res)
    trpc.ts         # tRPC router setup & middleware
    vite.ts         # Vite dev server integration
    magic-link.ts   # Magic link JWT generation/verification
    magic-link-context.ts   # User extraction from cookies
    magic-link-routes.ts    # Magic link auth routes
    env.ts          # Environment variables
    llm.ts          # LLM API wrapper (Gemini via Manus Forge)
  routers.ts        # Main tRPC router (773 lines)
  db.ts             # Database queries (510 lines)
  db-collaborative.ts       # Collaborative contact system
  db-authorized-users.ts    # User whitelist management
  enrichment.ts     # Profile enrichment orchestration
  morpheus.ts       # AI contact extraction from text

shared/             # Code shared between client/server
  _core/
    const.ts        # Shared constants (COOKIE_NAME, etc.)
    types.ts        # Shared TypeScript types

drizzle/            # Database schema and migrations
  schema.ts         # Drizzle table definitions (255 lines)
  migrations/       # SQL migration files
```

### Path Aliases

```typescript
"@/*"       → "./client/src/*"
"@shared/*" → "./shared/*"
"@assets/*" → "./attached_assets/*"
```

Configured in both `tsconfig.json` and `vite.config.ts`.

## API Communication (tRPC)

The app uses **tRPC** for end-to-end type-safe API calls between frontend and backend.

### Server Side (`server/routers.ts`)

Main router exports `appRouter` with nested routers:
- `auth` - Authentication (me, logout)
- `contacts` - Contact CRUD operations
- `companies` - Company management
- `events` - Networking events
- `graph` - Graph data for visualization
- `relationships` - Contact relationship management
- `telegram` - Telegram bot integration
- `queryHistory` - AI query tracking
- `admin` - Admin user management

**Procedure Types**:
- `publicProcedure` - No auth required
- `protectedProcedure` - Requires authenticated user (checks `ctx.user`)
- `adminProcedure` - Requires admin role

All inputs validated with Zod schemas.

### Client Side (`client/src/lib/trpc.ts`)

```typescript
export const trpc = createTRPCReact<AppRouter>();
```

Setup in `client/src/main.tsx`:
- `httpBatchLink` batches multiple queries
- `superjson` transformer for Date, Map, Set
- Credentials: "include" for cookie-based auth
- Global error handler redirects to login on UNAUTHORIZED

### Usage in Components

```typescript
const { data: contacts } = trpc.contacts.list.useQuery();
const createMutation = trpc.contacts.create.useMutation();
```

All tRPC calls go to `/api/trpc` endpoint.

## Authentication System

**Magic Link (Passwordless) Authentication**

Flow:
1. User enters email on login page
2. Backend generates JWT magic link token (15-min expiry) - `server/_core/magic-link.ts`
3. Email sent with magic link URL
4. User clicks link → token verified → session cookie created (30-day expiry)
5. Session cookie (`app_session_id`) used for subsequent requests

**User Whitelist**: Only emails in `authorizedUsers` table can log in. Default users initialized on startup in `server/_core/admin-users.ts`.

**Auth Context**: User extracted from cookie in tRPC context (`server/_core/context.ts`). Auth middleware (`server/_core/trpc.ts`) throws UNAUTHORIZED if user missing.

**Client Auth Hook**: `client/src/_core/hooks/useAuth.ts` provides `{ user, loading, isAuthenticated, logout, refresh }`.

## Database Patterns (Drizzle ORM)

Schema: `drizzle/schema.ts`

### Core Tables

**users**: Authentication and profiles
- `id`, `openId` (unique), `email`, `name`, `role` (user/admin)

**contacts**: SHARED contact pool (collaborative system)
- Basic info: `name`, `email`, `linkedinUrl`, `phone`, `company`, `role`
- Enriched data: `summary`, `experience`, `education`, `skills` (JSON)
- `createdBy` tracks who first created

**userContacts**: Junction table (many-to-many)
- Links users to contacts with user-specific data
- Private: `privateNotes`, `conversationSummary`, `sentiment`, `interestLevel`
- Relationship: `relationshipStrength`, `howWeMet`, `lastContactedAt`

**contactContributions**: Audit log for collaborative editing
- Tracks who added/updated each field on shared contacts

**companies**: Organizations with funding/employee data

**contactRelationships**: Graph edges
- Types: "introduced_by", "works_with", "investor_in", "mentor_of"

**events**: Networking events

**queryHistory**: AI query tracking

**authorizedUsers**: Email whitelist for login

### Collaborative Contact System

Key file: `server/db-collaborative.ts`

**Duplicate Detection** (in priority order):
1. Email (exact match)
2. LinkedIn URL (exact match)
3. Name + Company (exact match)

**`createOrLinkContact()` function**:
- Checks for duplicates before creating
- If duplicate: Links user to existing contact
- If new: Creates contact and user-contact link
- Returns: `{ contactId, isNew, matchedBy }`
- Logs contribution to audit trail

This pattern enables shared contact pool while preserving private notes per user.

## AI Features

### LLM Integration (`server/_core/llm.ts`)

Centralized `invokeLLM()` function:
- Uses Manus Forge API (OpenAI-compatible)
- Model: `gemini-2.5-flash`
- Supports JSON schema output with strict mode
- Thinking budget: 128 tokens, Max tokens: 32768

### AI Query Parsing (`server/services/query.service.ts`)

Natural language queries like "Who do I know at Microsoft?" parsed into structured filters:
- Intent classification: find, filter, recommend, analyze, introduction_path
- Extracts: companies, roles, skills, locations, relationships
- Generates follow-up question suggestions

### Contact Extraction (`server/morpheus.ts`)

Telegram bot integration extracts structured contact data from conversation text using LLM.

### Profile Enrichment (`server/enrichment.ts`)

Background jobs fetch LinkedIn/Twitter data to populate: `experience`, `education`, `skills`, `summary`, `profilePictureUrl`.

## Key Conventions

### Naming Conventions

- **Never use "claude" in branch names, file names, or identifiers.** Use descriptive names based on the feature or purpose (e.g., `feature/linkedin-enrichment` not `claude/review-xyz`).
- **Never add Claude as a co-author or contributor.** Do not include `Co-Authored-By: Claude` or any similar attribution in commit messages. Do not include "Generated with Claude Code" footers in PRs or commits.
- Branch names should follow the pattern: `feature/description`, `fix/description`, `refactor/description`
- Test data should use generic names, not specific identifiers that could break in CI

### UI Components

All Radix UI primitives wrapped in `client/src/components/ui/` with Tailwind styling using class-variance-authority pattern.

Pages wrapped in `<DashboardLayout>` with sidebar navigation.

### Data Fetching

TanStack Query manages cache with optimistic updates. Global error handling redirects to login on auth failure.

### Environment Variables

`.env` for development, `.env.production` for production. Centralized validation in `server/_core/env.ts`.

### Graph Visualization

Uses Cytoscape.js + react-force-graph-2d with force-directed layout (fCoSE algorithm). Nodes colored by company, sized by connection count.

## Common Patterns

### Adding a New tRPC Endpoint

1. Add procedure to appropriate router in `server/routers.ts`
2. Define Zod input schema for validation
3. Use `protectedProcedure` or `adminProcedure` for auth
4. Client automatically gets type-safe access via `trpc.routerName.procedureName.useQuery()` or `useMutation()`

### Adding a Database Table

1. Define table in `drizzle/schema.ts`
2. Run `npm run db:push` to generate and apply migration
3. Add helper functions in `server/db.ts` or new db file
4. Export types from schema for use in tRPC procedures

### Authentication Flow Changes

Files to modify:
- Token generation: `server/_core/magic-link.ts`
- Cookie extraction: `server/_core/magic-link-context.ts`
- Auth routes: `server/_core/magic-link-routes.ts`
- Client hook: `client/src/_core/hooks/useAuth.ts`

Session cookie name defined in `shared/const.ts` (shared constant).

## Testing

Vitest for unit tests. Test files: `server/test-*.test.ts`

Run tests: `npm run test`
