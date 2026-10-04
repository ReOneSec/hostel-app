import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await req.json();
    const { status } = body;

    if (!status || !["GENERATED", "PAID", "PARTIALLY_PAID", "OVERDUE"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const bill = await prisma.bill.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ data: bill });
  } catch (error: any) {
    console.error("Error updating bill status:", error);
    return NextResponse.json(
      { error: "Failed to update bill status" },
      { status: 500 }
    );
  }
}
