import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || !["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"].includes(user.role)) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const bills = await prisma.bill.findMany({
      where: { userId: user.id },
      include: {
        hostel: { select: { name: true } },
        payments: {
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            verifiedAt: true,
            utrNumber: true,
            transactionId: true,
            status: true,
          },
        },
        user: { 
          select: { 
            username: true, 
            email: true, 
            studentProfile: { select: { fullName: true } } 
          } 
        }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    return successResponse(bills);
  } catch (error: any) {
    console.error("Error fetching student bills:", error);
    return errorResponse("Failed to fetch bills", 500, "INTERNAL");
  }
}

