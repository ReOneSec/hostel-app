import { NextResponse } from "next/server";
import { generateBulkBills } from "@/lib/billing";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const generatedCount = await generateBulkBills(month, year, "SYSTEM_CRON");

    return NextResponse.json({ 
      success: true, 
      message: `Cron executed. Generated ${generatedCount} bills for ${month}/${year}` 
    });
  } catch (error: any) {
    console.error("CRON Error generating bills:", error);
    return NextResponse.json(
      { error: "Failed to generate bills via cron" },
      { status: 500 }
    );
  }
}
