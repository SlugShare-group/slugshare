import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UpdatePointsForm } from "@/components/UpdatePointsForm";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/auth/login");
  }

  // Verify user exists in database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    // User doesn't exist in database, redirect to login
    redirect("/auth/login");
  }

  // Get or create points record
  const points = await prisma.points.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      balance: 0,
    },
  });

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
        </div>

        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Points Balance</CardTitle>
              <CardDescription>Current dining points available</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-4xl font-bold text-blue-600">{points.balance}</p>
              <UpdatePointsForm currentBalance={points.balance} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{user.email}</p>
              </div>
              {user.name && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{user.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link href="/requests/create">Create Request</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/requests">View All Requests</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inbox">Inbox</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

