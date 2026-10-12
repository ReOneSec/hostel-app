import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { id: billId } = await params;

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        hostel: {
          select: {
            id: true,
            name: true,
            address: true,
            contactNumber: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
                mobile: true,
                parentMobile: true,
                emergencyContact: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          select: {
            id: true,
            amount: true,
            status: true,
            paymentDate: true,
            transactionId: true,
            utrNumber: true,
            proofFileUrl: true,
            verifiedAt: true,
            rejectionReason: true,
          },
        },
        lateFeeRecords: {
          orderBy: { calculatedAt: "desc" },
        },
      },
    });

    if (!bill) {
      return errorResponse("Bill not found", 404, "NOT_FOUND");
    }

    // Role check: Students can only view their own bill
    if (session.user.role === "STUDENT" && bill.userId !== session.user.id) {
      return errorResponse("Forbidden", 403, "FORBIDDEN");
    }

    // Hostel Manager check: Can only view bills in assigned hostels
    if (session.user.role === "HOSTEL_MANAGER") {
      const isAssigned = await prisma.hostelManagerAssignment.findFirst({
        where: {
          userId: session.user.id,
          hostelId: bill.hostelId,
          isActive: true,
        },
      });
      if (!isAssigned) {
        return errorResponse("Forbidden", 403, "FORBIDDEN");
      }
    }

    return successResponse(bill);
  } catch (error) {
    console.error("[Bill GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
