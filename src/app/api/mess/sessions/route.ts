import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || !["HOSTEL_MANAGER", "MONTHLY_MANAGER", "STUDENT", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    if (!hostelId) {
      return NextResponse.json({ error: "Hostel ID is required" }, { status: 400 });
    }

    const sessions = await prisma.messSession.findMany({
      where: { hostelId },
      include: {
        documents: true,
        _count: {
          select: {
            guestMeals: true,
            documents: true,
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return NextResponse.json({ data: sessions });
  } catch (error: any) {
    console.error("Error fetching mess sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized. Managers can start a session." }, { status: 403 });
    }

    const body = await req.json();
    const { hostelId, month, year, monthlyManagerUserId } = body;

    if (!hostelId || !month || !year) {
      return NextResponse.json({ error: "Hostel ID, month, and year are required" }, { status: 400 });
    }

    // Ensure no existing session for this month/year
    const existing = await prisma.messSession.findFirst({
      where: { hostelId, month: parseInt(month), year: parseInt(year) }
    });

    if (existing) {
      return NextResponse.json({ error: "A session already exists for this month and year" }, { status: 400 });
    }

    // Check if there is an active draft session (should ideally only have 1 draft at a time)
    const activeDraft = await prisma.messSession.findFirst({
      where: { hostelId, status: "DRAFT" }
    });

    if (activeDraft) {
      return NextResponse.json({ error: "Please close the currently active Draft session before starting a new one." }, { status: 400 });
    }

    // Handle Monthly Manager Assignment linking
    let monthlyManagerSessionId = null;

    // Check if there is already a MonthlyManagerSession for this month and year
    const existingMMSession = await prisma.monthlyManagerSession.findUnique({
      where: {
        hostelId_month_year: {
          hostelId,
          month: parseInt(month),
          year: parseInt(year)
        }
      }
    });

    if (existingMMSession) {
      monthlyManagerSessionId = existingMMSession.id;
      
      // If a specific user was requested, update it (only if role is admin/manager)
      if (monthlyManagerUserId && existingMMSession.userId !== monthlyManagerUserId && ["HOSTEL_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
        await prisma.monthlyManagerSession.update({
          where: { id: existingMMSession.id },
          data: { userId: monthlyManagerUserId }
        });
        
        // Update new user's role to MONTHLY_MANAGER if they are a STUDENT
        const targetUser = await prisma.user.findUnique({ where: { id: monthlyManagerUserId }});
        if (targetUser && targetUser.role === "STUDENT") {
          await prisma.user.update({
            where: { id: monthlyManagerUserId },
            data: { role: "MONTHLY_MANAGER" }
          });
        }
      }
    } else if (monthlyManagerUserId && ["HOSTEL_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      // Create a monthly manager session if none exists and user is admin/manager
      const mmSession = await prisma.monthlyManagerSession.create({
        data: {
          userId: monthlyManagerUserId,
          hostelId,
          month: parseInt(month),
          year: parseInt(year),
          appointedBy: user.id,
          isActive: true
        }
      });
      monthlyManagerSessionId = mmSession.id;

      // Update the user's role to MONTHLY_MANAGER only if they are currently a STUDENT
      const targetUser = await prisma.user.findUnique({ where: { id: monthlyManagerUserId }});
      if (targetUser && targetUser.role === "STUDENT") {
        await prisma.user.update({
          where: { id: monthlyManagerUserId },
          data: { role: "MONTHLY_MANAGER" }
        });
      }
    }

    const newSession = await prisma.messSession.create({
      data: {
        hostelId,
        month: parseInt(month),
        year: parseInt(year),
        monthlyManagerSessionId
      }
    });

    return NextResponse.json({ data: newSession }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating mess session:", error);
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }
}
