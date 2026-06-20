import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update privacy consent date using standard Prisma method
    await prisma.user.update({
      where: { id: user.id },
      data: { privacyConsentAt: new Date() }
    });

    return NextResponse.json({ 
      success: true, 
      privacyConsentAt: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("Error saving privacy consent:", error);
    return NextResponse.json({ error: "Failed to save privacy consent" }, { status: 500 });
  }
}
