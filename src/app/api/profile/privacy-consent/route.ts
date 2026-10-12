import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // Update privacy consent date using standard Prisma method
    await prisma.user.update({
      where: { id: user.id },
      data: { privacyConsentAt: new Date() }
    });

    return successResponse({ 
      privacyConsentAt: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("Error saving privacy consent:", error);
    return errorResponse("Failed to save privacy consent", 500, "INTERNAL");
  }
}

