import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "SUPER_ADMIN", "MONTHLY_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { counts } = body; // Array of { userId, mealCount }

    if (!Array.isArray(counts)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const messSession = await prisma.messSession.findUnique({
      where: { id: sessionId }
    });

    if (!messSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (messSession.status !== "DRAFT") {
      return NextResponse.json({ error: "Cannot modify meal counts of a closed session" }, { status: 400 });
    }

    // Upsert meal counts in a transaction
    await prisma.$transaction(
      counts.map((c: any) => 
        prisma.messStudentMealCount.upsert({
          where: {
            messSessionId_userId: {
              messSessionId: sessionId,
              userId: c.userId
            }
          },
          update: {
            mealCount: parseInt(c.mealCount, 10),
            enteredBy: user.id
          },
          create: {
            messSessionId: sessionId,
            userId: c.userId,
            mealCount: parseInt(c.mealCount, 10),
            enteredBy: user.id
          }
        })
      )
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving meal counts:", error);
    return NextResponse.json({ error: "Failed to save meal counts" }, { status: 500 });
  }
}
