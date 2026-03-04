// This file handles DELETE requests to remove a request from the database
// The route is: /api/requests/[id] where [id] is the request ID

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateDeleteRequest, validateEditRequest } from "@/lib/validation";

// This function handles DELETE HTTP requests
// When a user clicks "Delete" on a request, this function runs
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Step 1: Check if the user is logged in
    // getCurrentUser() gets the logged-in user's information from their session
    const user = await getCurrentUser();

    // If no user is logged in, return an error (401 = Unauthorized)
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Get the request ID from the URL
    // The [id] in the route becomes available in params
    // Example: DELETE /api/requests/abc123 -> requestId = "abc123"
    const { id: requestId } = await params;

    // Step 3: Look up the request in the database
    // findUnique finds one specific request by its ID
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    // Validate the request can be deleted
    const validation = validateDeleteRequest(request, user.id);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // Step 4: Actually delete the request from the database
    // This removes the request record permanently
    await prisma.request.delete({
      where: { id: requestId },
    });

    // Step 7: Return success message to the frontend
    return NextResponse.json({ success: true });
  } catch (error) {
    // If anything goes wrong (database error, etc.), catch it here
    // Log the error for debugging, then return a generic error message
    console.error("Error deleting request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 } // 500 = Internal Server Error
    );
  }
}

// Handles PATCH requests for editing a pending request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await request.json();
    const { location, pointsRequested, message, inPersonAllowed, qrCodeAllowed } = body;

    const existingRequest = await prisma.request.findUnique({
      where: { id: requestId },
    });

    const validation = validateEditRequest(existingRequest, user.id, {
      location,
      pointsRequested,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        location: location.trim(),
        pointsRequested,
        message: message || null,
        inPersonAllowed: inPersonAllowed ?? true,
        qrCodeAllowed: qrCodeAllowed ?? false,
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("Error editing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
