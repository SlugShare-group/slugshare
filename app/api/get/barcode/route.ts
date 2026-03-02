import { getCurrentUser } from "@/lib/auth";
import { retrieveBarcodePayload } from "@/lib/get/adapter";
import { fromGetError, getErrorResponse } from "@/lib/get/response";
import {
  getActiveGetSessionForUser,
  getLinkedCredentialForUser,
  markCredentialInvalid,
  shouldInvalidateCredential,
} from "@/lib/get/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return getErrorResponse("authentication_error", "Unauthorized", 401, false);
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    if (!requestId) {
      return getErrorResponse(
        "validation_error",
        "requestId is required",
        400,
        false
      );
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { getFulfillment: true },
    });

    if (!request) {
      return getErrorResponse("validation_error", "Request not found", 404, false);
    }

    if (request.requesterId !== user.id) {
      return getErrorResponse(
        "authorization_error",
        "You cannot access this request",
        403,
        false
      );
    }

    if (request.selectedFulfillmentMode !== "qr_code") {
      return Response.json({ state: "unavailable", reason: "wrong_mode" }, { status: 200 });
    }

    if (request.status === "completed") {
      return Response.json(
        { state: "completed", completedAt: request.completedAt?.toISOString() ?? null },
        { status: 200 }
      );
    }

    if (!request.getFulfillment || !request.donorId) {
      return Response.json({ state: "unavailable", reason: "not_ready" }, { status: 200 });
    }

    if (request.getFulfillment.status !== "active") {
      return Response.json(
        {
          state: request.getFulfillment.status === "completed" ? "completed" : "unavailable",
          reason: request.getFulfillment.status,
          completedAt: request.getFulfillment.completedAt?.toISOString() ?? null,
        },
        { status: 200 }
      );
    }

    const credential = await getLinkedCredentialForUser(request.donorId);
    if (!credential) {
      return Response.json(
        { state: "unavailable", reason: "donor_not_linked" },
        { status: 200 }
      );
    }

    try {
      const { sessionId } = await getActiveGetSessionForUser(request.donorId);
      const payload = await retrieveBarcodePayload(sessionId);
      return Response.json(
        {
          state: "active",
          payload,
          fetchedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (error) {
      if (shouldInvalidateCredential(error)) {
        await markCredentialInvalid(request.donorId, "auth_invalid");
        return Response.json(
          { state: "unavailable", reason: "invalid_session" },
          { status: 200 }
        );
      }
      return fromGetError(error, "Failed to fetch barcode payload");
    }
  } catch (error) {
    console.error("Error handling /api/get/barcode:", error);
    return getErrorResponse(
      "internal_error",
      "Failed to fetch barcode payload",
      500,
      false
    );
  }
}
