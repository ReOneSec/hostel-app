import { prisma } from "./prisma";

interface SendPushOptions {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string>;
}

/**
 * Send a notification (creates Notification in DB and dispatches FCM push notification to user devices)
 */
export async function notify({
  userId,
  title,
  message,
  type = "SYSTEM",
  data = {},
}: SendPushOptions): Promise<boolean> {
  try {
    // 1. Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        isRead: false,
      },
    });

    // 2. Fetch user's registered devices
    let devices: Array<{ fcmToken: string; platform: string }> = [];
    try {
      devices = await (prisma as any).device.findMany({
        where: { userId },
        select: { fcmToken: true, platform: true },
      });
    } catch (e) {
      // In case Device table is pending DB migration
    }

    if (devices.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Push] No devices registered for user ${userId}`);
      }
      return true;
    }

    // 3. Dispatch FCM Push
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (fcmServerKey) {
      for (const device of devices) {
        try {
          await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: device.fcmToken,
              notification: {
                title,
                body: message,
              },
              data: {
                notificationId: notification.id,
                type,
                ...data,
              },
            }),
          });
        } catch (fcmErr) {
          console.error(`[Push] Failed to send to token ${device.fcmToken}:`, fcmErr);
        }
      }
    } else {
      console.log(
        `[Push] Stub: push dispatched to ${devices.length} device(s) for user ${userId}: "${title}"`
      );
    }

    return true;
  } catch (error) {
    console.error("[Push] Failed to notify user:", error);
    return false;
  }
}
