import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    if (!hostelId) {
      return NextResponse.json({ error: "Hostel ID is required" }, { status: 400 });
    }

    if (user.role !== "SUPER_ADMIN") {
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { hostelId, userId: user.id, isActive: true }
      });

      if (!assignment) {
        return NextResponse.json({ error: "Not managing this hostel" }, { status: 403 });
      }
    }

    const config = await prisma.messConfig.findFirst({
      where: { hostelId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' }
    });

    return NextResponse.json({ data: config });
  } catch (error: any) {
    console.error("Error fetching mess config:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    
    if (!user || !["HOSTEL_MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { hostelId, cookPayment, cleanerPayment, dustbinPayment, guestMealRate } = body;

    if (!hostelId) {
      return NextResponse.json({ error: "Hostel ID is required" }, { status: 400 });
    }

    if (user.role !== "SUPER_ADMIN") {
      const assignment = await prisma.hostelManagerAssignment.findFirst({
        where: { hostelId, userId: user.id, isActive: true }
      });

      if (!assignment) {
        return NextResponse.json({ error: "Not managing this hostel" }, { status: 403 });
      }
    }

    // End previous config
    await prisma.messConfig.updateMany({
      where: { hostelId, effectiveTo: null },
      data: { effectiveTo: new Date() }
    });

    // Create new config
    const newConfig = await prisma.messConfig.create({
      data: {
        hostelId,
        cookPayment: parseFloat(cookPayment) || 0,
        cleanerPayment: parseFloat(cleanerPayment) || 0,
        dustbinPayment: parseFloat(dustbinPayment) || 0,
        guestMealRate: parseFloat(guestMealRate) || 65,
        effectiveFrom: new Date(),
        setBy: user.id
      }
    });

    return NextResponse.json({ data: newConfig });
  } catch (error: any) {
    console.error("Error updating mess config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
