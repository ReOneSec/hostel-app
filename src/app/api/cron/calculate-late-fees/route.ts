import { NextResponse } from "next/server";
import { calculateLateFees } from "@/lib/late-fee";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updatedCount = await calculateLateFees();

    return NextResponse.json({ 
      success: true, 
      message: `Cron executed. Applied late fees to ${updatedCount} bills.` 
    });
  } catch (error: any) {
    console.error("CRON Error calculating late fees:", error);
    return NextResponse.json(
      { error: "Failed to calculate late fees via cron" },
      { status: 500 }
    );
  }
}
