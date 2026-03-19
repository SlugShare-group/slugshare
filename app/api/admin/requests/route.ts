import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // get the user from the database to check if they are an admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // get all requests with requester and donor info
    const requests = await prisma.request.findMany({
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        donor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // count requests by status for the stats section
    let pendingCount = 0;
    let acceptedCount = 0;
    let completedCount = 0;
    let declinedCount = 0;

    for (const req of requests) {
      if (req.status === "pending") pendingCount++;
      if (req.status === "accepted") acceptedCount++;
      if (req.status === "completed") completedCount++;
      if (req.status === "declined") declinedCount++;
    }

    const stats = {
      total: requests.length,
      pending: pendingCount,
      accepted: acceptedCount,
      completed: completedCount,
      declined: declinedCount,
    };

    return NextResponse.json({ requests, stats });
  } catch (error) {
    console.error("Error fetching admin requests:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
