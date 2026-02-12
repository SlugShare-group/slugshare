"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UCSC_LOCATIONS } from "@/lib/locations";
import Link from "next/link";

export default function CreateRequestPage() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [pointsRequested, setPointsRequested] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inPersonAllowed, setInPersonAllowed] = useState(true);
  const [qrCodeAllowed, setQrCodeAllowed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const points = parseInt(pointsRequested, 10);

      if (!location || location.trim().length === 0) {
        setError("Location is required");
        setIsLoading(false);
        return;
      }

      if (isNaN(points) || points <= 0) {
        setError("Points requested must be a positive number");
        setIsLoading(false);
        return;
      }
      if (!inPersonAllowed && !qrCodeAllowed) {
        setError("Please select at least one fulfillment option.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          location: location.trim(),
          pointsRequested: points,
          message: message.trim() || null,
	      inPersonAllowed,
  	      qrCodeAllowed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create request");
        setIsLoading(false);
        return;
      }

      console.log("Request created successfully:", data);

      // Small delay to ensure database commit, then redirect
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Redirect to requests list
      router.push("/requests");
    } catch (error) {
      console.error("Error creating request:", error);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Request</CardTitle>
            <CardDescription>
              Request dining points from other UCSC students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] md:text-sm"
                  required
                >
                  <option value="">Select a location</option>
                  {UCSC_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Points Requested</Label>
                <Input
                  id="points"
                  type="number"
                  min="1"
                  step="1"
                  value={pointsRequested}
                  onChange={(e) => setPointsRequested(e.target.value)}
                  placeholder="Enter points amount"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any additional details..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>How can this request be fulfilled?</Label>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={inPersonAllowed}
                        onChange={(e) => setInPersonAllowed(e.target.checked)}
                    />
                    Meet in person
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={qrCodeAllowed}
                        onChange={(e) => setQrCodeAllowed(e.target.checked)}
                    />
                    Receive QR code
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Request"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/requests")}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

