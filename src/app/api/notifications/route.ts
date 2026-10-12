import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paginatedResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "20")));
    const skip = (page - 1) * perPage;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { sentAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.notification.count({
        where: { userId: session.user.id },
      }),
    ]);

    return paginatedResponse(items, total, page, perPage);
  } catch (error) {
    console.error("[Notifications GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
