"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface RequestUser {
  id: string;
  name: string | null;
  email: string;
}

interface AdminRequest {
  id: string;
  location: string;
  pointsRequested: number;
  status: string;
  message: string | null;
  inPersonAllowed: boolean;
  qrCodeAllowed: boolean;
  selectedFulfillmentMode: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: RequestUser;
  donor: RequestUser | null;
}

interface Stats {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  declined: number;
}

export default function AdminPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/requests");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load admin data");
        return;
      }

      setRequests(data.requests);
      setStats(data.stats);
      setError("");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // helper to get the color for each status
  const getStatusColor = (status: string) => {
    if (status === "pending") return "text-yellow-600";
    if (status === "accepted") return "text-green-600";
    if (status === "completed") return "text-blue-600";
    if (status === "declined") return "text-red-600";
    return "text-gray-600";
  };

  if (isLoading) {
    return (
        <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
          <div className="mx-auto max-w-5xl">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
          <div className="mx-auto max-w-5xl">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
               Back to Dashboard
            </Link>
            <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error === "Forbidden" ? "You do not have admin access." : error}
            </div>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
        <div className="mx-auto max-w-5xl">

          {/* header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Admin
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
                All Requests
              </h1>
            </div>
            <div className="flex gap-3 pt-3">
              <button
                  onClick={fetchData}
                  className="rounded-xl border border-border bg-card/90 px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-accent"
              >
                Refresh
              </button>
              <Link
                  href="/dashboard"
                  className="rounded-xl border border-border bg-card/90 px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-accent"
              >
                Back To Dashboard
              </Link>
            </div>
          </div>

          {/* stats section */}
          {stats && (
              <div className="mb-8">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Overview
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/5">
                    <p className="text-2xl font-black">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/5">
                    <p className="text-2xl font-black text-yellow-600">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/5">
                    <p className="text-2xl font-black text-green-600">{stats.accepted}</p>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/5">
                    <p className="text-2xl font-black text-blue-600">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-lg shadow-black/5">
                    <p className="text-2xl font-black text-red-500">{stats.declined}</p>
                    <p className="text-xs text-muted-foreground">Declined</p>
                  </div>
                </div>
              </div>
          )}

          {/* requests list */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              All requests ({requests.length})
            </p>

            {requests.length === 0 ? (
                <Card className="rounded-2xl border border-border bg-card/90 shadow-lg shadow-black/5">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No requests found.
                  </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                      <Card
                          key={req.id}
                          className="rounded-2xl border border-border bg-card/90 shadow-lg shadow-black/5"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base font-bold">{req.location}</CardTitle>
                              <CardDescription className="text-xs">ID: {req.id}</CardDescription>
                            </div>
                            <span className={`text-sm font-semibold capitalize ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-1.5 text-sm">
                          <p className="text-2xl font-black text-blue-600">
                            {req.pointsRequested}{" "}
                            <span className="text-sm font-normal text-muted-foreground">points</span>
                          </p>

                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Requester:</span>{" "}
                            {req.requester.name ?? req.requester.email} ({req.requester.email})
                          </p>

                          {req.donor && (
                              <p className="text-muted-foreground">
                                <span className="font-medium text-foreground">Donor:</span>{" "}
                                {req.donor.name ?? req.donor.email} ({req.donor.email})
                              </p>
                          )}

                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Fulfillment:</span>{" "}
                            {req.inPersonAllowed && "In person"}
                            {req.inPersonAllowed && req.qrCodeAllowed && " & "}
                            {req.qrCodeAllowed && "QR code"}
                            {req.selectedFulfillmentMode && ` — selected: ${req.selectedFulfillmentMode.replace("_", " ")}`}
                          </p>

                          {req.message && (
                              <p className="rounded-lg bg-muted/50 px-3 py-2 italic text-muted-foreground">
                                &ldquo;{req.message}&rdquo;
                              </p>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Created: {new Date(req.createdAt).toLocaleString()}
                            {req.completedAt && ` · Completed: ${new Date(req.completedAt).toLocaleString()}`}
                          </p>
                        </CardContent>
                      </Card>
                  ))}
                </div>
            )}
          </div>

        </div>
      </div>
  );
}
