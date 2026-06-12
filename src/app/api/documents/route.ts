import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "HOSTEL_MANAGER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const hostelId = searchParams.get("hostelId");

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (hostelId) {
      // Find documents for users who have active assignments in this hostel
      whereClause.user = {
        hostelAssignments: {
          some: {
            hostelId,
            status: "ACTIVE",
          },
        },
      };
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            studentProfile: {
              select: {
                fullName: true,
              },
            },
            hostelAssignments: {
              where: { status: "ACTIVE" },
              include: {
                hostel: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ data: documents });
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
