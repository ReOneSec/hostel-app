import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "MONTHLY_MANAGER", "STUDENT", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const sessionId = resolvedParams.id;
    const body = await req.json();
    const { type, amount, description, expenseDate, billFileUrl, userId } = body;

    if (!type || !["MARKET", "WATER", "INITIAL_CONTRIBUTION"].includes(type)) {
      return NextResponse.json({ error: "Invalid expense type" }, { status: 400 });
    }

    if (!amount || !expenseDate) {
      return NextResponse.json({ error: "Amount and date are required" }, { status: 400 });
    }

    const messSession = await prisma.messSession.findUnique({
      where: { id: sessionId }
    });

    if (!messSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (messSession.status !== "DRAFT") {
      return NextResponse.json({ error: "Cannot add expenses to a closed session" }, { status: 400 });
    }

    const targetUserId = userId || user.id;

    // Validate that the target user is actively assigned to this hostel
    const activeAssignment = await prisma.hostelAssignment.findFirst({
      where: {
        userId: targetUserId,
        hostelId: messSession.hostelId,
        status: "ACTIVE"
      }
    });

    if (!activeAssignment) {
      return NextResponse.json({ error: "Target user is not actively assigned to this hostel" }, { status: 400 });
    }

    if (type === "MARKET") {
      const expense = await prisma.messMarketExpense.create({
        data: {
          messSessionId: sessionId,
          userId: targetUserId,
          amount: parseFloat(amount),
          description,
          expenseDate: new Date(expenseDate),
          billFileUrl,
          enteredBy: user.id
        }
      });
      return NextResponse.json({ data: expense }, { status: 201 });
    } 
    
    if (type === "WATER") {
      const expense = await prisma.messWaterExpense.create({
        data: {
          messSessionId: sessionId,
          userId: targetUserId,
          amount: parseFloat(amount),
          expenseDate: new Date(expenseDate),
          billFileUrl,
          enteredBy: user.id
        }
      });
      return NextResponse.json({ data: expense }, { status: 201 });
    }

    if (type === "INITIAL_CONTRIBUTION") {
      const contribution = await prisma.messInitialContribution.create({
        data: {
          messSessionId: sessionId,
          userId: targetUserId,
          amount: parseFloat(amount),
          contributionDate: new Date(expenseDate),
          notes: description,
          enteredBy: user.id
        }
      });
      return NextResponse.json({ data: contribution }, { status: 201 });
    }

  } catch (error: any) {
    console.error("Error adding expense:", error);
    return NextResponse.json({ error: "Failed to add expense" }, { status: 500 });
  }
}
