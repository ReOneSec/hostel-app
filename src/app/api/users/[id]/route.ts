import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    
    let { id } = await params;

    // Support for /api/users/me
    if (id === "me") {
      id = session.user.id;
    }

    // SUPER_ADMIN can view anyone. HOSTEL_MANAGER can only view students (or we can tighten it to students in their hostel later)
    if (session.user.role === "STUDENT" && session.user.id !== id) {
      return errorResponse("Forbidden", 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        isProfileComplete: true,
        privacyConsentAt: true,
        joiningDate: true,
        createdAt: true,
        studentProfile: true, // gets all fields from StudentProfile
        remarks: {
          orderBy: { createdAt: "desc" },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            fileName: true,
            fileUrl: true,
            status: true,
            uploadedAt: true,
            rejectionReason: true,
            verifiedBy: true,
            verifiedAt: true,
          },
          orderBy: { uploadedAt: "desc" }
        },
        selfies: {
          where: { isCurrent: true },
          select: {
            id: true,
            fileUrl: true,
            capturedAt: true,
            latitude: true,
            longitude: true,
          }
        },
        bills: {
          where: { status: { in: ["GENERATED", "PARTIALLY_PAID", "OVERDUE"] } },
          orderBy: { generatedAt: "desc" },
          take: 1
        },
        hostelAssignments: {
          include: {
            hostel: true
          }
        },
        roomAssignments: {
          where: { status: "ACTIVE" },
          include: { room: true }
        },
        bedAssignments: {
          where: { status: "ACTIVE" },
          include: { bed: true }
        },
        lifecycleEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            fromHostel: { select: { name: true } },
            toHostel: { select: { name: true } },
          }
        }
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    const userResponse = { ...user } as any;
    const documents = [...userResponse.documents];

    // Attempt to recover missing verifier data from AuditLogs for legacy verifications
    const legacyApprovedDocs = documents.filter(d => 
      (d.status === "VERIFIED" || d.status === "APPROVED") && (!d.verifiedBy || !d.verifiedAt)
    );

    if (legacyApprovedDocs.length > 0) {
      const docIds = legacyApprovedDocs.map(d => d.id);
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityId: { in: docIds },
          action: { in: ["DOCUMENT_APPROVED", "DOCUMENT_VERIFIED"] },
          entity: "Document"
        },
        orderBy: { createdAt: "desc" }
      });

      for (const doc of legacyApprovedDocs) {
        const log = auditLogs.find(l => l.entityId === doc.id);
        if (log) {
          doc.verifiedBy = doc.verifiedBy || log.userId;
          doc.verifiedAt = doc.verifiedAt || log.createdAt;
        }
      }
    }

    const verifierIds = [...new Set(documents.map(d => d.verifiedBy).filter(Boolean))] as string[];
    let verifierMap: Record<string, string> = {};

    if (verifierIds.length > 0) {
      const verifiers = await prisma.user.findMany({
        where: { id: { in: verifierIds } },
        select: { id: true, username: true, studentProfile: { select: { fullName: true } } }
      });
      verifierMap = verifiers.reduce((acc, v) => {
        acc[v.id] = v.studentProfile?.fullName || v.username;
        return acc;
      }, {} as Record<string, string>);
    }

    userResponse.documents = documents.map(d => ({
      ...d,
      verifierName: d.verifiedBy ? verifierMap[d.verifiedBy] : null
    }));

    return successResponse(userResponse);
  } catch (error) {
    console.error("[User GET]", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401);
    }
    
    // Only SUPER_ADMIN can delete users
    if (session.user.role !== "SUPER_ADMIN") {
      return errorResponse("Forbidden", 403);
    }

    let { id } = await params;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (user.id === session.user.id) {
      return errorResponse("Cannot delete yourself", 400);
    }

    // Try to delete from Supabase Auth
    try {
      const adminClient = createAdminClient();
      // Try to fetch by email if possible or just list to find
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      if (!listError && users) {
        const supabaseUser = users.find(u => u.email === user.email);
        if (supabaseUser) {
          await adminClient.auth.admin.deleteUser(supabaseUser.id);
        }
      }
    } catch (err) {
      console.warn("Could not delete from Supabase Auth:", err);
    }

    // Find all bills to delete related late fee records
    const bills = await prisma.bill.findMany({ where: { userId: id }, select: { id: true } });
    const billIds = bills.map(b => b.id);

    await prisma.$transaction([
      prisma.profileEditRequest.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } }),
      prisma.hostel.updateMany({ where: { managerId: id }, data: { managerId: null } }),
      prisma.messSession.updateMany({ 
        where: { monthlyManagerSession: { userId: id } }, 
        data: { monthlyManagerSessionId: null } 
      }),
      
      prisma.lateFeeRecord.deleteMany({ where: { billId: { in: billIds } } }),
      prisma.payment.deleteMany({ where: { userId: id } }),
      prisma.bill.deleteMany({ where: { userId: id } }),
      
      prisma.studentProfile.deleteMany({ where: { userId: id } }),
      prisma.remark.deleteMany({ where: { userId: id } }),
      prisma.document.deleteMany({ where: { userId: id } }),
      prisma.selfie.deleteMany({ where: { userId: id } }),
      prisma.hostelAssignment.deleteMany({ where: { userId: id } }),
      prisma.roomAssignment.deleteMany({ where: { userId: id } }),
      prisma.bedAssignment.deleteMany({ where: { userId: id } }),
      prisma.lifecycleEvent.deleteMany({ where: { userId: id } }),
      prisma.hostelManagerAssignment.deleteMany({ where: { userId: id } }),
      prisma.monthlyManagerSession.deleteMany({ where: { userId: id } }),
      prisma.rentConfig.deleteMany({ where: { userId: id } }),
      prisma.messInitialContribution.deleteMany({ where: { userId: id } }),
      prisma.messMarketExpense.deleteMany({ where: { userId: id } }),
      prisma.messWaterExpense.deleteMany({ where: { userId: id } }),
      prisma.messStudentMealCount.deleteMany({ where: { userId: id } }),
      prisma.messSettlement.deleteMany({ where: { userId: id } }),
      prisma.auditLog.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.profileEditRequest.deleteMany({ where: { userId: id } }),
      
      prisma.user.delete({ where: { id } })
    ]);

    return successResponse({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("[User DELETE]", error);
    return errorResponse("Internal server error", 500);
  }
}

