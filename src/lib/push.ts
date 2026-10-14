import { prisma } from "@/lib/prisma";
import { getFirebaseMessaging, isPushConfigured } from "@/lib/firebase-admin";

export type PushEvent = "NOTICE" | "INVOICE_DOWNLOADED" | "BILL_GENERATED" | "LATE_FEE_ADDED";
export type PushRoute = "notices" | "bill";

export interface PushPayload {
  title: string;
  body: string;
  data: {
    event: PushEvent;
    route: PushRoute;
    announcementId?: string;
    billId?: string;
    [key: string]: string | undefined;
  };
}

export interface PushDeliveryResult {
  intendedUsers: number;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  tokensRemoved: number;
  skipped?: boolean;
}

const CHUNK_SIZE = 500;

const INVALID_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/**
 * Normalizes data payload so every property value is strictly a string (FCM requirement).
 */
export function sanitizePushData(data: Record<string, unknown>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      clean[key] = String(value);
    }
  }
  return clean;
}

/**
 * Sends a push notification to users' registered devices via Firebase Cloud Messaging HTTP v1.
 * Guarantees failure isolation: errors are caught, logged as counts, and never thrown.
 */
export async function sendPushNotification(
  userIds: string[],
  payload: PushPayload
): Promise<PushDeliveryResult> {
  const result: PushDeliveryResult = {
    intendedUsers: userIds.length,
    totalTokens: 0,
    successCount: 0,
    failureCount: 0,
    tokensRemoved: 0,
  };

  try {
    // 1. Check production kill switch
    if (process.env.PUSH_ENABLED === "false") {
      result.skipped = true;
      return result;
    }

    // 2. Check configuration gate
    if (!isPushConfigured()) {
      result.skipped = true;
      return result;
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      result.skipped = true;
      return result;
    }

    if (!userIds.length) {
      return result;
    }

    // 3. Apply pilot allowlist if configured
    let targetUserIds = userIds;
    const pilotEnv = process.env.PUSH_PILOT_USER_IDS?.trim();
    if (pilotEnv) {
      const pilotSet = new Set(
        pilotEnv
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      );
      targetUserIds = targetUserIds.filter((id) => pilotSet.has(id));
      if (!targetUserIds.length) {
        result.skipped = true;
        return result;
      }
    }

    // 4. Fetch registered devices from database
    if (typeof (prisma as any)?.device?.findMany !== "function") {
      return result;
    }

    const devices: Array<{ id: string; fcmToken: string; userId: string }> = await (prisma as any).device.findMany({
      where: { userId: { in: targetUserIds } },
      select: { id: true, fcmToken: true, userId: true },
    });

    if (!devices.length) {
      return result;
    }

    const tokenStrings: string[] = devices.map((d) => d.fcmToken).filter(Boolean);
    const tokens: string[] = Array.from(new Set(tokenStrings));
    result.totalTokens = tokens.length;

    if (!tokens.length) {
      return result;
    }

    const stringData = sanitizePushData(payload.data);

    // 5. Chunk tokens in batches of up to 500
    const staleTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunkTokens = tokens.slice(i, i + CHUNK_SIZE);

      try {
        const response = await messaging.sendEachForMulticast({
          tokens: chunkTokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: stringData,
          android: {
            notification: {
              channelId: "hostel_updates",
            },
          },
        });

        result.successCount += response.successCount;
        result.failureCount += response.failureCount;

        // Inspect failure responses for stale / unregistered tokens
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (errorCode && INVALID_TOKEN_ERRORS.has(errorCode)) {
              const staleToken = chunkTokens[idx];
              if (staleToken) {
                staleTokens.push(staleToken);
              }
            }
          }
        });
      } catch (chunkErr: any) {
        // Chunk-level failure (e.g. network timeout or batch rejection)
        result.failureCount += chunkTokens.length;
        console.error(
          `[Push Transport] Batch failed for ${chunkTokens.length} tokens:`,
          chunkErr?.message || chunkErr
        );
      }
    }

    // 6. Delete invalid/unregistered tokens from database
    if (staleTokens.length > 0 && typeof (prisma as any)?.device?.deleteMany === "function") {
      try {
        const deleteRes = await (prisma as any).device.deleteMany({
          where: { fcmToken: { in: staleTokens } },
        });
        result.tokensRemoved = deleteRes.count;
      } catch (cleanErr: any) {
        console.error("[Push Transport] Stale token cleanup failed:", cleanErr?.message || cleanErr);
      }
    }

    // 7. Log summary counts only (Never log raw tokens or private data)
    console.log(
      `[Push Transport] Sent to ${result.intendedUsers} users | Tokens: ${result.totalTokens} | Success: ${result.successCount} | Failures: ${result.failureCount} | Tokens Removed: ${result.tokensRemoved}`
    );

    return result;
  } catch (err: any) {
    // Ultimate failure isolation
    console.error("[Push Transport] Unexpected error in sendPushNotification:", err?.message || err);
    return result;
  }
}
