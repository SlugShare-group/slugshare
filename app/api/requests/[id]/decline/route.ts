import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;

    // Get the request with requester info
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // Validate: Can't decline your own request
    if (request.requesterId === user.id) {
      return NextResponse.json(
        { error: "You cannot decline your own request" },
        { status: 400 }
      );
    }

    // Validate: Request must be pending
    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Request is no longer pending" },
        { status: 400 }
      );
    }

    // Update request status to declined and create notification
    await prisma.$transaction([
      prisma.request.update({
        where: { id: requestId },
        data: {
          status: "declined",
          donorId: user.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: request.requesterId,
          type: "request_declined",
          message: `${user.name || user.email} declined your request for ${request.pointsRequested} points at ${request.location}`,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error declining request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

