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
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : undefined,
        newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : undefined,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    });
  } catch (error) {
    // Audit logging should never crash the main operation
    console.error("[AuditLog] Failed to create audit log:", error);
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
