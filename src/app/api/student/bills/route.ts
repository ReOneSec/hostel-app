import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || !["STUDENT", "MONTHLY_MANAGER", "HOSTEL_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bills = await prisma.bill.findMany({
      where: { userId: user.id },
      include: {
        hostel: { select: { name: true } }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    return NextResponse.json({ data: bills });
  } catch (error: any) {
    console.error("Error fetching student bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
