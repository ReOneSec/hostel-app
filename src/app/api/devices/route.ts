import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { z } from "zod";

const registerDeviceSchema = z.object({
  fcmToken: z.string().min(1, "fcmToken is required"),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    const body = await req.json();
    const parseResult = registerDeviceSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse("Invalid device payload", 400, "VALIDATION_ERROR");
    }

    const { fcmToken, platform } = parseResult.data;

    const device = await prisma.device.upsert({
      where: { fcmToken },
      update: {
        userId: session.user.id,
        platform,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        fcmToken,
        platform,
      },
    });

    return successResponse(device, 201);
  } catch (error) {
    console.error("[Devices POST]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }

    let fcmToken: string | undefined;
    try {
      const body = await req.json();
      fcmToken = body?.fcmToken;
    } catch {
      // Body is optional
    }

    if (fcmToken) {
      await prisma.device.deleteMany({
        where: {
          userId: session.user.id,
          fcmToken,
        },
      });
    } else {
      await prisma.device.deleteMany({
        where: {
          userId: session.user.id,
        },
      });
    }

    return successResponse({ message: "Device unregistered successfully" });
  } catch (error) {
    console.error("[Devices DELETE]", error);
    return errorResponse("Internal server error", 500, "INTERNAL");
  }
}
