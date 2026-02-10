"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  FULFILLMENT_MODES,
  FULFILLMENT_MODE_LABELS,
  type FulfillmentMode,
  isCodeFulfillmentMode,
  isFulfillmentMode,
} from "@/lib/fulfillment";

interface Request {
  id: string;
  requesterId: string;
  donorId: string | null;
  location: string;
  pointsRequested: number;
  status: string;
  fulfillmentMode: string | null;
  message: string | null;
  codeIssuedAt: string | null;
  codeExpiresAt: string | null;
  completedAt: string | null;
  completionTrigger: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  donor: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function RequestsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [defaultFulfillmentMode, setDefaultFulfillmentMode] =
    useState<FulfillmentMode>("CODE_ONLY");
  const [modeOverrides, setModeOverrides] = useState<
    Record<string, FulfillmentMode | "">
  >({});

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCurrentUser(), fetchRequests(), fetchGetSettings()]);
    };
    loadData();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/user");
      if (response.ok) {
        const data = await response.json();
        setCurrentUserId(data.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchGetSettings = async () => {
    try {
      const response = await fetch("/api/get");
      if (!response.ok) return;
      const data = await response.json();
      if (isFulfillmentMode(data.defaultFulfillmentMode)) {
        setDefaultFulfillmentMode(data.defaultFulfillmentMode);
      }
    } catch (settingsError) {
      console.error("Error fetching GET settings:", settingsError);
    }
  };

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/requests");
      const data = await response.json();

      console.log("Requests API response:", { status: response.status, data });

      if (!response.ok) {
        setError(data.error || "Failed to fetch requests");
        return;
      }

      console.log("Setting requests:", data);
      setRequests(data);
      setError("");
    } catch (error) {
      console.error("Error fetching requests:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (
    requestId: string,
    fulfillmentModeOverride?: FulfillmentMode
  ) => {
    if (processingId) return;

    try {
      setProcessingId(requestId);
      const response = await fetch(`/api/requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fulfillmentModeOverride,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to accept request");
        return;
      }

      // Refresh requests list
      await fetchRequests();
      router.refresh();
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    if (processingId) return;

    try {
      setProcessingId(requestId);
      const response = await fetch(`/api/requests/${requestId}/decline`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to decline request");
        return;
      }

      // Refresh requests list
      await fetchRequests();
      router.refresh();
    } catch (error) {
      console.error("Error declining request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  /* Page.tsx delete function starts here */
  /* This function is called when the user clicks the Delete button on one of their requests */
  /* requestId is the unique ID of the request to delete */
  const handleDelete = async (requestId: string) => {
    /* Stops multiple delete operations from happening at the same time */
    /* If there is already a delete being processed then don't start another one */
    if (processingId) return;

    /* Show popup asking the user if they're sure */
    /* If they click "Cancel", confirm() returns false and exit */
    if (!confirm("Are you sure you want to delete this request?")) {
      return; /* User cancelled, so we stop here */
    }

    try {
      /* Mark this request as being processed and shows "Deleting" on the button */
      setProcessingId(requestId);

      /* Send a DELETE request to our API endpoint */
      /* This calls the DELETE function in app/api/requests/[id]/route.ts */
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE", /* HTTP method tells the server we want to delete */
      });

      /* Parse the JSON response from the server */
      const data = await response.json();

      /* Check if the server returned an error */
      /* response.ok is true if status code is 200-299, false otherwise */
      if (!response.ok) {
        /* Show the error message from the server */
        alert(data.error || "Failed to delete request");
        return; /* Stop here if there was an error */
      }

      /* If we get here then delete was successful */
      /* Refresh list of requests to show updated data */
      await fetchRequests(); /* Re-fetch all requests from the API */
      router.refresh(); /* Tell Next.js to refresh the page data */
    } catch (error) {
      /* If something unexpected goes wrong */
      console.error("Error deleting request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      /* Run this code whether the delete succeeded or failed */
      /* Clear the processing state so the button goes back to normal */
      setProcessingId(null);
    }
  };
  /* Page.tsx delete function ends here */


  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "text-green-600";
      case "declined":
        return "text-red-600";
      case "completed":
        return "text-blue-600";
      default:
        return "text-yellow-600";
    }
  };

  const getModeLabel = (mode: string | null) =>
    isFulfillmentMode(mode) ? FULFILLMENT_MODE_LABELS[mode] : "Not set";

  // Separate user's own requests from others' requests
  const myRequests = currentUserId
    ? requests.filter((req) => req.requesterId === currentUserId)
    : [];
  const otherRequests = currentUserId
    ? requests.filter((req) => req.requesterId !== currentUserId)
    : requests;

  // Debug logging
  console.log("Debug info:", {
    currentUserId,
    requestsCount: requests.length,
    myRequestsCount: myRequests.length,
    otherRequestsCount: otherRequests.length,
  });

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex gap-4">
            <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
              Refresh
            </Button>
            <Button asChild>
              <Link href="/requests/create">Create Request</Link>
            </Button>
          </div>
        </div>

        <h1 className="mb-6 text-3xl font-bold">All Requests</h1>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading requests...</div>
        ) : (
          <>
            {/* My Requests Section */}
            {myRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-semibold">My Requests</h2>
                <div className="space-y-4">
                  {myRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{request.location}</CardTitle>
                            <CardDescription>
                              You requested {request.pointsRequested} points
                            </CardDescription>
                          </div>
                          <span
                            className={`text-sm font-medium capitalize ${getStatusColor(
                              request.status
                            )}`}
                          >
                            {request.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <p className="text-2xl font-bold text-blue-600">
                              {request.pointsRequested} points
                            </p>
                          </div>

                          {request.message && (
                            <div>
                              <p className="text-sm text-muted-foreground">
                                {request.message}
                              </p>
                            </div>
                          )}

                          {request.fulfillmentMode && (
                            <p className="text-sm text-muted-foreground">
                              Fulfillment: {getModeLabel(request.fulfillmentMode)}
                            </p>
                          )}

                          {request.status === "accepted" && request.donor && (
                            <p className="text-sm text-muted-foreground">
                              Accepted by {request.donor.name || request.donor.email}
                            </p>
                          )}

                          {request.status === "declined" && request.donor && (
                            <p className="text-sm text-muted-foreground">
                              Declined by {request.donor.name || request.donor.email}
                            </p>
                          )}

                          {request.status === "completed" && request.completedAt && (
                            <p className="text-sm text-muted-foreground">
                              Completed {new Date(request.completedAt).toLocaleString()}
                            </p>
                          )}

                          {request.status === "accepted" &&
                            isCodeFulfillmentMode(request.fulfillmentMode) && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/scan/${request.id}`}>Open Scan Code</Link>
                              </Button>
                            )}

                         {/* Added delete button functionality to page.tsx starts here */}
                          {/* Only show the delete button if the request is still pending
                          Once a request is accepted or declined it cant be deleted */}
                          {request.status === "pending" && (
                            <div className="flex gap-2">
                              {/* Delete button - calls handleDelete when clicked */}
                              <Button
                                onClick={() => handleDelete(request.id)} // When clicked call handleDelete with this request's ID
                                disabled={processingId === request.id} // Disable button while deleting to stop double clicks
                                variant="destructive" // red button 
                                size="sm" // Small button size
                              >
                                {/* Show "Deleting..." while processing otherwise show "Delete" */}
                                {processingId === request.id ? "Deleting..." : "Delete"}
                              </Button>
                            </div>
                          )}
                         {/* Added delete button functionality to page.tsx ends here */}
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(request.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Other Requests Section */}
            <div>
              <h2 className="mb-4 text-2xl font-semibold">
                {myRequests.length > 0 ? "Other Requests" : "All Requests"}
              </h2>
              {otherRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No requests available. Be the first to create one!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {otherRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{request.location}</CardTitle>
                      <CardDescription>
                        Requested by {request.requester.name || request.requester.email}
                      </CardDescription>
                    </div>
                    <span
                      className={`text-sm font-medium capitalize ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {request.pointsRequested} points
                      </p>
                    </div>

                    {request.message && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {request.message}
                        </p>
                      </div>
                    )}

                    {request.fulfillmentMode && (
                      <p className="text-sm text-muted-foreground">
                        Fulfillment: {getModeLabel(request.fulfillmentMode)}
                      </p>
                    )}

                    {request.status === "pending" && (
                      <div className="space-y-2">
                        <select
                          value={modeOverrides[request.id] || ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            setModeOverrides((prev) => ({
                              ...prev,
                              [request.id]: isFulfillmentMode(value)
                                ? value
                                : "",
                            }));
                          }}
                          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        >
                          <option value="">
                            Use default ({FULFILLMENT_MODE_LABELS[defaultFulfillmentMode]})
                          </option>
                          {FULFILLMENT_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {FULFILLMENT_MODE_LABELS[mode]}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                        <Button
                          onClick={() =>
                            handleAccept(
                              request.id,
                              modeOverrides[request.id] || undefined
                            )
                          }
                          disabled={processingId === request.id}
                          size="sm"
                        >
                          {processingId === request.id ? "Processing..." : "Accept"}
                        </Button>
                        <Button
                          onClick={() => handleDecline(request.id)}
                          disabled={processingId === request.id}
                          variant="outline"
                          size="sm"
                        >
                          Decline
                        </Button>
                        </div>
                      </div>
                    )}

                    {request.status === "accepted" && request.donor && (
                      <p className="text-sm text-muted-foreground">
                        Accepted by {request.donor.name || request.donor.email}
                      </p>
                    )}

                    {request.status === "completed" && request.completedAt && (
                      <p className="text-sm text-muted-foreground">
                        Completed {new Date(request.completedAt).toLocaleString()}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Created {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
