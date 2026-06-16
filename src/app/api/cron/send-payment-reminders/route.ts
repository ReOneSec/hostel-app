import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, paymentReminderEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      }
    }

    // Audit log
    const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }});
    const auditUserId = admin ? admin.id : "SYSTEM_CRON";

    if (emailsSent > 0) {
      await prisma.auditLog.create({
        data: {
          userId: auditUserId,
          action: "SEND_PAYMENT_REMINDERS",
          entity: "Bill",
          newValues: { month: currentMonth, year: currentYear, emailsSent }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cron executed. Sent ${emailsSent} payment reminders.` 
    });
  } catch (error: any) {
    console.error("CRON Error sending reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders via cron" },
      { status: 500 }
    );
  }
}
