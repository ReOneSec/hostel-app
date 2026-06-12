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
    const { hostelId, roomId, bedId, amount, feeType } = body;

    if (!hostelId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // End previous active bed fee for this specific level (bed, room, or hostel)
    await prisma.bedFee.updateMany({
      where: {
        hostelId,
        roomId: roomId || null,
        bedId: bedId || null,
        effectiveTo: null
      },
      data: {
        effectiveTo: new Date()
      }
    });

    // Create new bed fee
    const newFee = await prisma.bedFee.create({
      data: {
        hostelId,
        roomId: roomId || null,
        bedId: bedId || null,
        amount,
        feeType: feeType || "RECURRING",
        effectiveFrom: new Date(),
        setBy: user.id,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SET_BED_FEE",
        entity: "BedFee",
        entityId: newFee.id,
        newValues: { hostelId, roomId, bedId, amount, feeType }
      }
    });

    return NextResponse.json({ data: newFee });
  } catch (error: any) {
    console.error("Error setting bed fee:", error);
    return NextResponse.json(
      { error: "Failed to set bed fee" },
      { status: 500 }
    );
  }
}
