/**
 * Client-safe RBAC helpers (compatibility shim).
 *
 * The single source of truth for role -> permission data lives in
 * `./permission-map`, which is pure and safe to import from Server Components,
 * Client Components and the edge proxy. This module simply re-exports it under
 * its original name so existing imports keep working.
 *
 * Full server-side guards (requirePagePermission, requireApiPermission)
 * remain in `@/lib/auth/permissions`, which is server-only.
 */

export * from './permission-map';
