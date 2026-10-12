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
  source?: "app" | "web";
}


/**
 * Safely clones an object into JSON-serializable data.
 * Native structuredClone fails on objects with functions or Prisma Decimal instances (e.g. `function i(o)`).
 * JSON serialization handles Decimal (via Decimal.prototype.toJSON()) and converts to primitive JSON values.
 */
function safeJsonClone(obj: unknown) {
  if (obj === undefined || obj === null) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(obj, (_key, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      })
    );
  } catch (error) {
    console.warn("[AuditLog] Failed to serialize audit values:", error);
    return undefined;
  }
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
  source,
}: AuditLogInput) {

  try {
    // Clone values safely before the async boundary
    const clonedOld = safeJsonClone(oldValues);
    const clonedNew = safeJsonClone(newValues);

    const finalNew = clonedNew
      ? source
        ? { ...clonedNew, source }
        : clonedNew
      : source
      ? { source }
      : undefined;

    // Fire-and-forget: don't block the response waiting for the audit insert
    prisma.auditLog
      .create({
        data: {
          userId,
          action,
          entity,
          entityId,
          oldValues: clonedOld,
          newValues: finalNew,
          ipAddress: ipAddress ?? undefined,
          userAgent: userAgent ?? undefined,
        },
      })
      .catch((error) => {
        // Audit logging should never crash the main operation
        console.error("[AuditLog] Failed to create audit log:", error);
      });

  } catch (error) {
    console.error("[AuditLog] Failed to prepare audit log:", error);
  }
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
