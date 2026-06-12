import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, hostelId, amount, notes } = body;

    if (!studentId || !hostelId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // End previous active rent configs
    await prisma.rentConfig.updateMany({
      where: {
        userId: studentId,
        hostelId: hostelId,
        effectiveTo: null
      },
      data: {
        effectiveTo: new Date()
      }
    });

    // Create new rent config
    const newRent = await prisma.rentConfig.create({
      data: {
        userId: studentId,
        hostelId,
        amount,
        effectiveFrom: new Date(),
        setBy: user.id,
        notes
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SET_RENT",
        entity: "RentConfig",
        entityId: newRent.id,
        newValues: { studentId, hostelId, amount }
      }
    });

    return NextResponse.json({ data: newRent });
  } catch (error: any) {
    console.error("Error setting rent:", error);
    return NextResponse.json(
      { error: "Failed to set rent" },
      { status: 500 }
    );
  }
}
