---
name: code-review
description: Review code for dealflow-network project conventions, error handling, type safety, and best practices. Use when reviewing pull requests, checking code quality, or validating implementations. This skill is read-only and will not modify files.
allowed-tools: Read, Grep, Glob
---

# Code Review

Review code against dealflow-network project conventions and best practices.

## Review Checklist

### 1. tRPC Patterns
- [ ] Correct procedure type used (public/protected/admin)
- [ ] Zod input validation present
- [ ] Database null check (`if (!db)`)
- [ ] TRPCError used for errors (not raw throws)
- [ ] Appropriate error codes (NOT_FOUND, UNAUTHORIZED, etc.)

### 2. Type Safety
- [ ] No `any` types (use `unknown` if truly unknown)
- [ ] Proper type inference from Drizzle schema
- [ ] Generic types properly constrained
- [ ] No type assertions without justification

### 3. Error Handling
- [ ] Try-catch in async operations that can fail
- [ ] Meaningful error messages
- [ ] Errors don't expose sensitive info
- [ ] Client shows user-friendly toasts

### 4. Database Operations
- [ ] Using Drizzle query builder (not raw SQL)
- [ ] Proper null checks before operations
- [ ] Transactions for multi-step operations
- [ ] Indexes for frequently queried columns

### 5. React Patterns
- [ ] Hooks follow rules (top-level, conditional-free)
- [ ] Dependencies correct in useEffect
- [ ] Loading and error states handled
- [ ] Cache invalidation after mutations

### 6. Security
- [ ] No secrets in code
- [ ] Input validation on all user data
- [ ] Auth checks on protected routes
- [ ] No SQL injection (use query builder)

### 7. Project Conventions
- [ ] camelCase for variables and functions
- [ ] kebab-case for file names
- [ ] No emoji in code or commits
- [ ] Consistent import ordering

## Common Issues to Flag

### Bad: Missing Database Check
```typescript
// Missing null check
const db = await getDb();
const results = await db.select()... // Could crash if db is null
```

### Good: Proper Database Check
```typescript
const db = await getDb();
if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
const results = await db.select()...
```

### Bad: Using `any`
```typescript
function processData(data: any) { ... }
```

### Good: Proper Types
```typescript
function processData(data: Contact) { ... }
// Or if truly unknown:
function processData(data: unknown) { ... }
```

### Bad: Raw Error Throw
```typescript
throw new Error("Not found");
```

### Good: tRPC Error
```typescript
throw new TRPCError({ code: "NOT_FOUND", message: "Contact not found" });
```

### Bad: No Cache Invalidation
```typescript
const mutation = trpc.contacts.create.useMutation({
  onSuccess: () => {
    toast.success("Created");
    // Missing: cache invalidation
  },
});
```

### Good: With Cache Invalidation
```typescript
const mutation = trpc.contacts.create.useMutation({
  onSuccess: () => {
    utils.contacts.list.invalidate();
    toast.success("Created");
  },
});
```

### Bad: Exposing Internal Errors
```typescript
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: `Database error: ${error.sqlMessage}` // Exposes DB details
});
```

### Good: Generic Error Message
```typescript
console.error("Database error:", error); // Log for debugging
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "An error occurred"
});
```

## Review Output Format

When reviewing, I will provide:

```
## Code Review: [filename]

### Summary
[Brief overview of the changes]

### Issues Found

#### Critical
- [Issues that must be fixed]

#### Warnings
- [Issues that should be addressed]

#### Suggestions
- [Optional improvements]

### What Looks Good
- [Positive feedback on well-written code]
```

## Files to Cross-Reference

When reviewing, check consistency with:
- `server/routers.ts` - Router patterns
- `drizzle/schema.ts` - Type definitions
- `client/src/components/` - UI patterns
- `server/db.ts` - Database function patterns
