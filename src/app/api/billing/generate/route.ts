import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateBulkBills } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const generatedCount = await generateBulkBills(month, year, user.id);

    return NextResponse.json({ 
      data: { 
        message: `Generated ${generatedCount} bills for ${month}/${year}` 
      } 
    });
  } catch (error: any) {
    console.error("Error generating bills:", error);
    return NextResponse.json(
      { error: "Failed to generate bills" },
      { status: 500 }
    );
  }
}
