import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "MONTHLY_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { mealDate, guestCount } = body;

    if (!mealDate || !guestCount) {
      return NextResponse.json({ error: "Date and count are required" }, { status: 400 });
    }

    const messSession = await prisma.messSession.findUnique({
      where: { id: sessionId }
    });

    if (!messSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (messSession.status !== "DRAFT") {
      return NextResponse.json({ error: "Cannot add guest meals to a closed session" }, { status: 400 });
    }

    const guestMeal = await prisma.messGuestMeal.create({
      data: {
        messSessionId: sessionId,
        mealDate: new Date(mealDate),
        guestCount: parseInt(guestCount, 10),
        enteredBy: user.id
      }
    });

    return NextResponse.json({ data: guestMeal }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding guest meal:", error);
    return NextResponse.json({ error: "Failed to add guest meal" }, { status: 500 });
  }
}
