import { prisma } from "./prisma";
import { sendPushNotification, type PushDeliveryResult, type PushPayload } from "./push";

export interface SendPushOptions {
  userId: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, string>;
}

// In-memory cooldown map for staff invoice downloads: `${billId}:${staffUserId}` -> timestamp
const invoiceCooldowns = new Map<string, number>();
const INVOICE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Resets cooldown cache (useful in automated tests)
 */
export function _resetInvoiceCooldownsForTesting(): void {
  invoiceCooldowns.clear();
}

/**
 * General-purpose notification function.
 * Creates an in-app Notification record in the database and dispatches FCM push via HTTP v1.
 * Guarantees failure isolation: errors are caught, logged, and never bubble up to callers.
 */
export async function notify({
  userId,
  title,
  message,
  type = "SYSTEM",
  data = {},
}: SendPushOptions): Promise<boolean> {
  try {
    // 1. Create in-app Notification record
    let notificationId: string | undefined;
    try {
      if (typeof (prisma as any)?.notification?.create === "function") {
        const notification = await (prisma as any).notification.create({
          data: {
            userId,
            type,
            title,
            message,
            isRead: false,
          },
        });
        notificationId = notification.id;
      }
    } catch (dbErr) {
      console.error("[Notify] Failed to persist in-app notification:", dbErr);
    }

    // 2. Dispatch via Push Transport
    const route: "notices" | "bill" = data.route === "bill" ? "bill" : "notices";
    const event = (data.event as any) || "NOTICE";

    await sendPushNotification([userId], {
      title,
      body: message,
      data: {
        event,
        route,
        ...(notificationId ? { notificationId } : {}),
        ...data,
      },
    });

    return true;
  } catch (error) {
    console.error("[Notify] Error in notify:", error);
    return false;
  }
}

/**
 * Trigger A: New notice published.
 * Resolves authorized student recipients based on audience, excludes sender,
 * creates in-app notification records and sends FCM push.
 */
export async function notifyNoticePublished(announcement: {
  id: string;
  title: string;
  body: string;
  audience: "GLOBAL" | "HOSTEL" | "PRIVATE";
  hostelId?: string | null;
  targetUserId?: string | null;
  senderId?: string;
}): Promise<PushDeliveryResult> {
  const emptyResult: PushDeliveryResult = {
    intendedUsers: 0,
    totalTokens: 0,
    successCount: 0,
    failureCount: 0,
    tokensRemoved: 0,
    skipped: true,
  };

  try {
    let recipientUserIds: string[] = [];

    if (announcement.audience === "GLOBAL") {
      if (typeof (prisma as any)?.user?.findMany === "function") {
        const activeStudents = await (prisma as any).user.findMany({
          where: {
            role: "STUDENT",
            status: "ACTIVE",
            ...(announcement.senderId ? { id: { not: announcement.senderId } } : {}),
          },
          select: { id: true },
        });
        recipientUserIds = activeStudents.map((s: any) => s.id);
      }
    } else if (announcement.audience === "HOSTEL" && announcement.hostelId) {
      if (typeof (prisma as any)?.hostelAssignment?.findMany === "function") {
        const hostelAssignments = await (prisma as any).hostelAssignment.findMany({
          where: {
            hostelId: announcement.hostelId,
            status: "ACTIVE",
            user: {
              role: "STUDENT",
              status: "ACTIVE",
              ...(announcement.senderId ? { id: { not: announcement.senderId } } : {}),
            },
          },
          select: { userId: true },
        });
        recipientUserIds = Array.from(new Set(hostelAssignments.map((a: any) => a.userId)));
      }
    } else if (announcement.audience === "PRIVATE" && announcement.targetUserId) {
      if (announcement.targetUserId !== announcement.senderId) {
        if (typeof (prisma as any)?.user?.findFirst === "function") {
          const student = await (prisma as any).user.findFirst({
            where: {
              id: announcement.targetUserId,
              role: "STUDENT",
              status: "ACTIVE",
            },
            select: { id: true },
          });
          if (student) {
            recipientUserIds = [student.id];
          }
        }
      }
    }

    if (!recipientUserIds.length) {
      return emptyResult;
    }

    const shortBody =
      announcement.body.length > 200
        ? announcement.body.slice(0, 197) + "..."
        : announcement.body;

    // 1. In-app notifications
    try {
      if (typeof (prisma as any)?.notification?.createMany === "function") {
        await (prisma as any).notification.createMany({
          data: recipientUserIds.map((userId) => ({
            userId,
            type: "ANNOUNCEMENT",
            title: announcement.title,
            message: shortBody,
            isRead: false,
          })),
        });
      }
    } catch (dbErr) {
      console.error("[Notify] Failed to create in-app notification records:", dbErr);
    }

    // 2. FCM Push
    const payload: PushPayload = {
      title: announcement.title,
      body: shortBody,
      data: {
        event: "NOTICE",
        route: "notices",
        announcementId: announcement.id,
      },
    };

    return await sendPushNotification(recipientUserIds, payload);
  } catch (err) {
    console.error("[Notify] notifyNoticePublished failed:", err);
    return emptyResult;
  }
}

/**
 * Trigger B: Staff invoice download.
 * Notifies the student owner when authorized staff downloads their invoice.
 * Enforces cooldown and suppresses self-downloads.
 */
export async function notifyInvoiceDownloaded({
  billId,
  studentUserId,
  staffUserId,
}: {
  billId: string;
  studentUserId: string;
  staffUserId: string;
}): Promise<PushDeliveryResult> {
  const emptyResult: PushDeliveryResult = {
    intendedUsers: 0,
    totalTokens: 0,
    successCount: 0,
    failureCount: 0,
    tokensRemoved: 0,
    skipped: true,
  };

  try {
    // 1. A student's own download does not notify them
    if (staffUserId === studentUserId) {
      return emptyResult;
    }

    // 2. Apply short bill-plus-actor cooldown to prevent notification noise
    const cooldownKey = `${billId}:${staffUserId}`;
    const now = Date.now();
    const lastSent = invoiceCooldowns.get(cooldownKey);
    if (lastSent && now - lastSent < INVOICE_COOLDOWN_MS) {
      return emptyResult;
    }
    invoiceCooldowns.set(cooldownKey, now);

    const title = "Invoice Downloaded";
    const body = "Your invoice was downloaded by hostel staff.";

    // 3. Create in-app notification
    try {
      if (typeof (prisma as any)?.notification?.create === "function") {
        await (prisma as any).notification.create({
          data: {
            userId: studentUserId,
            type: "INVOICE_DOWNLOADED",
            title,
            message: body,
            isRead: false,
          },
        });
      }
    } catch (dbErr) {
      console.error("[Notify] Failed to persist invoice downloaded notification:", dbErr);
    }

    // 4. Dispatch FCM Push
    const payload: PushPayload = {
      title,
      body,
      data: {
        event: "INVOICE_DOWNLOADED",
        route: "bill",
        billId,
      },
    };

    return await sendPushNotification([studentUserId], payload);
  } catch (err) {
    console.error("[Notify] notifyInvoiceDownloaded failed:", err);
    return emptyResult;
  }
}

/**
 * Trigger C: Bill generated.
 * Called across all bill creation paths (rent, bed fee, establishment fee, manual month-status).
 */
export async function notifyBillGenerated(bill: {
  id: string;
  userId: string;
  billType?: string;
  totalAmount: number | { toNumber(): number } | string;
  dueDate: Date | string;
  month?: number;
  year?: number;
}): Promise<PushDeliveryResult> {
  const emptyResult: PushDeliveryResult = {
    intendedUsers: 0,
    totalTokens: 0,
    successCount: 0,
    failureCount: 0,
    tokensRemoved: 0,
    skipped: true,
  };

  try {
    const rawAmount =
      typeof bill.totalAmount === "object" && "toNumber" in bill.totalAmount
        ? bill.totalAmount.toNumber()
        : Number(bill.totalAmount);
    const amountStr = isNaN(rawAmount) ? "0" : rawAmount.toFixed(0);

    let typeLabel = "Hostel Fee";
    if (bill.billType === "RENT") typeLabel = "Monthly Rent";
    else if (bill.billType === "ESTABLISHMENT_FEE") typeLabel = "Establishment Fee";
    else if (bill.billType === "BED_FEE") typeLabel = "Annual Bed Fee";

    const dueDateObj = new Date(bill.dueDate);
    const formattedDue = isNaN(dueDateObj.getTime())
      ? "due date"
      : dueDateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

    const title = `New Bill: ${typeLabel}`;
    const body = `Your ${typeLabel} bill of ₹${amountStr} has been generated. Due date: ${formattedDue}.`;

    // 1. Create in-app Notification
    try {
      if (typeof (prisma as any)?.notification?.create === "function") {
        await (prisma as any).notification.create({
          data: {
            userId: bill.userId,
            type: "BILL_GENERATED",
            title,
            message: body,
            isRead: false,
          },
        });
      }
    } catch (dbErr) {
      console.error("[Notify] Failed to persist bill generated notification:", dbErr);
    }

    // 2. Dispatch FCM Push
    const payload: PushPayload = {
      title,
      body,
      data: {
        event: "BILL_GENERATED",
        route: "bill",
        billId: bill.id,
      },
    };

    return await sendPushNotification([bill.userId], payload);
  } catch (err) {
    console.error("[Notify] notifyBillGenerated failed:", err);
    return emptyResult;
  }
}

/**
 * Trigger D: Late fee / fine added.
 * Notifies student with the fine amount added and new total balance.
 */
export async function notifyLateFeeAdded({
  billId,
  userId,
  amountAdded,
  newTotal,
  lateFeeRecordId,
}: {
  billId: string;
  userId: string;
  amountAdded: number;
  newTotal: number;
  lateFeeRecordId?: string;
}): Promise<PushDeliveryResult> {
  const emptyResult: PushDeliveryResult = {
    intendedUsers: 0,
    totalTokens: 0,
    successCount: 0,
    failureCount: 0,
    tokensRemoved: 0,
    skipped: true,
  };

  try {
    const title = "Late Fee Added";
    const body = `A late fee of ₹${amountAdded.toFixed(0)} has been applied to your bill. New total: ₹${newTotal.toFixed(0)}. Please pay immediately.`;

    // 1. In-app Notification
    try {
      if (typeof (prisma as any)?.notification?.create === "function") {
        await (prisma as any).notification.create({
          data: {
            userId,
            type: "LATE_FEE_ADDED",
            title,
            message: body,
            isRead: false,
          },
        });
      }
    } catch (dbErr) {
      console.error("[Notify] Failed to persist late fee notification:", dbErr);
    }

    // 2. FCM Push
    const payload: PushPayload = {
      title,
      body,
      data: {
        event: "LATE_FEE_ADDED",
        route: "bill",
        billId,
        ...(lateFeeRecordId ? { lateFeeRecordId } : {}),
      },
    };

    return await sendPushNotification([userId], payload);
  } catch (err) {
    console.error("[Notify] notifyLateFeeAdded failed:", err);
    return emptyResult;
  }
}
