import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    // auth() already fetches user data from DB — no need for a second query.
    // Return the session user data directly, which now includes hostelId,
    // hostelName, and fullName from the enriched auth() query.
    return successResponse(session.user);
  } catch (error) {
    console.error("[Auth Me GET]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}

