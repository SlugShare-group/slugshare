import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAcceptRequest } from "@/lib/validation";

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

    // Get the request
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

    // Get or create donor's points
    const donorPoints = await prisma.points.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        balance: 0,
      },
    });

    // Validate the request can be accepted
    const validation = validateAcceptRequest(request, user.id, donorPoints.balance);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Get or create requester's points
    const requesterPoints = await prisma.points.upsert({
      where: { userId: request.requesterId },
      update: {},
      create: {
        userId: request.requesterId,
        balance: 0,
      },
    });

    // Perform atomic transaction: transfer points, update request, and create notification
    await prisma.$transaction([
      // Decrease donor's balance
      prisma.points.update({
        where: { userId: user.id },
        data: {
          balance: {
            decrement: request.pointsRequested,
          },
        },
      }),
      // Increase requester's balance
      prisma.points.update({
        where: { userId: request.requesterId },
        data: {
          balance: {
            increment: request.pointsRequested,
          },
        },
      }),
      // Update request status and donor
      prisma.request.update({
        where: { id: requestId },
        data: {
          status: "accepted",
          donorId: user.id,
        },
      }),
      // Create notification for requester
      prisma.notification.create({
        data: {
          userId: request.requesterId,
          type: "request_accepted",
          message: `${user.name || user.email} accepted your request for ${request.pointsRequested} points at ${request.location}`,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

