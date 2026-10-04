import { prisma } from "./prisma";

interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an audit log entry. This function is intentionally fire-and-forget:
 * it does NOT await the database write so it never blocks the API response.
 * Callers can still `await` this function for compatibility, but the DB insert
 * runs in the background regardless.
 */
export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}: AuditLogInput) {
  // Clone values synchronously before the async boundary
  const clonedOld = oldValues ? (structuredClone(oldValues) as any) : undefined;
  const clonedNew = newValues ? (structuredClone(newValues) as any) : undefined;

  // Fire-and-forget: don't block the response waiting for the audit insert
  prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId,
      oldValues: clonedOld,
      newValues: clonedNew,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  }).catch((error) => {
    // Audit logging should never crash the main operation
    console.error("[AuditLog] Failed to create audit log:", error);
  });
}

/**
 * Extract IP address from request headers
 */
export function getIpAddress(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    null
  );
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get("user-agent") ?? null;
}
