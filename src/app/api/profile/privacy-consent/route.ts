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

    // Use executeRaw to bypass Prisma Client cache until it's regenerated
    await prisma.$executeRaw`UPDATE "users" SET "privacyConsentAt" = NOW() WHERE "id" = ${user.id}`;

    return NextResponse.json({ 
      success: true, 
      privacyConsentAt: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("Error saving privacy consent:", error);
    return NextResponse.json({ error: "Failed to save privacy consent" }, { status: 500 });
  }
}
