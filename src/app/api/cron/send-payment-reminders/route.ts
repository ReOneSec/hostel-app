import { prisma } from "@/lib/prisma";
import { sendEmail, paymentReminderEmail } from "@/lib/email";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const secret = process.env.CRON_SECRET;
    const isAuthorized = Boolean(
      secret && (cronSecretHeader === secret || authHeader === `Bearer ${secret}`)
    );

    if (!isAuthorized) {
      return errorResponse("Unauthorized cron execution", 401, "UNAUTHORIZED");
    }


    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Find all unpaid bills for the current month
    const unpaidBills = await prisma.bill.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
        status: { in: ["GENERATED", "PARTIALLY_PAID"] }
      },
      include: {
        user: {
          include: {
            studentProfile: true
          }
        }
      }
    });

    let emailsSent = 0;

    for (const bill of unpaidBills) {
      const studentName = bill.user.studentProfile?.fullName || bill.user.username;
      const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
      const outstandingBalance = (bill.totalAmount.toNumber() - bill.paidAmount.toNumber()).toFixed(2);
      
      const diffTime = bill.dueDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        await sendEmail({
          to: bill.user.email,
          subject: `Action Required: Payment Reminder - ${monthName} ${currentYear}`,
          html: paymentReminderEmail(studentName, monthName, currentYear, outstandingBalance, daysLeft),
          userId: bill.user.id,
          type: "PAYMENT_REMINDER"
        });
        emailsSent++;

        if (daysLeft <= 2) {
          try {
            const { createSystemNotice } = await import("@/lib/services/announcements");
            await createSystemNotice({
              targetUserId: bill.user.id,
              title: `Bill due in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
              body: `Your bill for ${monthName} ${currentYear} has an outstanding balance of Rs. ${outstandingBalance} due in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`,
              eventKey: `due-reminder-${bill.id}`,
            });
          } catch (err) {
            console.error("[System Notice] Failed to create due reminder announcement:", err);
          }
        }
      }
    }

    // Audit log
    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }});

    if (emailsSent > 0 && admin) {
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "SEND_PAYMENT_REMINDERS",
          entity: "Bill",
          newValues: { month: currentMonth, year: currentYear, emailsSent }
        }
      });
    }

    return successResponse({ 
      message: `Cron executed. Sent ${emailsSent} payment reminders.`,
      emailsSent,
    });
  } catch (error: any) {
    console.error("CRON Error sending reminders:", error);
    return errorResponse("Failed to send reminders via cron", 500, "INTERNAL");
  }
}

