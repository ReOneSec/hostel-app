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
    const { hostelId, amount, feeType } = body;

    if (!hostelId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // End previous active establishment fee
    await prisma.establishmentFee.updateMany({
      where: {
        hostelId: hostelId,
        effectiveTo: null
      },
      data: {
        effectiveTo: new Date()
      }
    });

    // Create new establishment fee
    const newFee = await prisma.establishmentFee.create({
      data: {
        hostelId,
        amount,
        feeType: feeType || "RECURRING",
        effectiveFrom: new Date(),
        setBy: user.id,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "SET_ESTABLISHMENT_FEE",
        entity: "EstablishmentFee",
        entityId: newFee.id,
        newValues: { hostelId, amount, feeType }
      }
    });

    return NextResponse.json({ data: newFee });
  } catch (error: any) {
    console.error("Error setting establishment fee:", error);
    return NextResponse.json(
      { error: "Failed to set establishment fee" },
      { status: 500 }
    );
  }
}
