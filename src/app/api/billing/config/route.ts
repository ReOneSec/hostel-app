import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBillingConfig } from "@/lib/services/billing";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hostelId = searchParams.get("hostelId");

    if (!hostelId) {
      return NextResponse.json({ error: "hostelId is required" }, { status: 400 });
    }

    const data = await getBillingConfig(hostelId);

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching billing config:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing configuration" },
      { status: 500 }
    );
  }
}
