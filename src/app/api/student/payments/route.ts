import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"].includes(user.role)) {
      return errorResponse("Unauthorized", 403, "FORBIDDEN");
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      include: {
        bill: {
          select: { month: true, year: true, totalAmount: true }
        },
        user: {
          select: { username: true, email: true, studentProfile: { select: { fullName: true } } }
        }
      },
      orderBy: { submittedAt: "desc" }
    });

    return successResponse(payments);
  } catch (error: any) {
    console.error("Error fetching student payments:", error);
    return errorResponse("Failed to fetch payments", 500, "INTERNAL");
  }
}

