import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      include: {
        bill: {
          select: { month: true, year: true, totalAmount: true }
        }
      },
      orderBy: { submittedAt: "desc" }
    });

    return NextResponse.json({ data: payments });
  } catch (error: any) {
    console.error("Error fetching student payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
