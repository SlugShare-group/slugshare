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
//Import dropdown functionality to use for fitler apply function
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; //used for entering the maximum donation amount
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronDown } from "lucide-react"; 
import { UCSC_LOCATIONS } from "@/lib/locations"; //all available dining locations

interface Request {
  id: string;
  requesterId: string;
  donorId: string | null;
  location: string;
  pointsRequested: number;
  status: string;
  message: string | null;
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
  // filters requests based on locations and max amount willing to donate
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [maxDonation, setMaxDonation] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCurrentUser(), fetchRequests()]);
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

  const handleAccept = async (requestId: string) => {
    if (processingId) return;

    try {
      setProcessingId(requestId);
      const response = await fetch(`/api/requests/${requestId}/accept`, {
        method: "POST",
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
      default:
        return "text-yellow-600";
    }
  };

  // Separate user's own requests from others' requests
  const myRequests = currentUserId
    ? requests.filter((req) => req.requesterId === currentUserId)
    : [];
  const otherRequests = currentUserId
    ? requests.filter((req) => req.requesterId !== currentUserId)
    : requests;

  // Apply location filter: if any locations selected, only show those; otherwise show all
  const locationFilter = (req: Request) =>
    selectedLocations.size === 0 || selectedLocations.has(req.location);
  // This converts the maxdonation input string into a number, if the input is empty it gets treated as "no limit"
  const maxDonationNum = maxDonation === "" ? null : parseInt(maxDonation, 10);
  //Checks if the max donation value is valid, so if it exists, is a number and is not negative
  const maxDonationValid =
    maxDonationNum !== null && !Number.isNaN(maxDonationNum) && maxDonationNum >= 0;
  //Applies the locaiton filter to the current users own reuqest
  const filteredMyRequests = myRequests.filter(locationFilter);
  //applies the filters to the other users requests
  const filteredOtherRequests = otherRequests.filter((req) => {
    //excludes the ruequests that dont match the selected location
    if (!locationFilter(req)) return false;
    //if max donation is set, exclude requests that ask for more points than allowed
    if (maxDonationValid && req.pointsRequested > maxDonationNum!) return false;
    //If all checks pass, include this reuqest
    return true;
  });

  //Toggles a location on or off in the dropdown menu (selectedLocations) set
  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) => {
      //Creates a new set so React detects the state change
      const next = new Set(prev);
      //If the location is already selected, then remove it, otherwise add it
      if (next.has(location)) next.delete(location);
      else next.add(location);
      return next;
    });
  };
  //Clears the filters by resetting the location selecations and max donation input
  const clearFilters = () => {
    setSelectedLocations(new Set()); //reset selected locations
    setMaxDonation(""); //reset max don
  };

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


        <div className="mb-6 flex flex-wrap items-center gap-4"> {/*Page header and filter controls container*/}

          <h1 className="text-3xl font-bold">All Requests</h1>{/*Page title*/}
          {/*dropdown menu that contains all filter options*/}
          <DropdownMenu>
            {/*button that opens the filter dropdown*/}
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Filters
                {/*indicator shown when any filter is active*/}
                {(selectedLocations.size > 0 || maxDonation !== "") && (
                  <span className="ml-1 size-2 rounded-full bg-primary" aria-hidden />
                )}
                {/*arrow icon indicating dropdown*/}
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            {/*dropdown menu content*/}
            <DropdownMenuContent align="start" className="w-72 p-0">
              {/*dropdown header*/}
              <div className="border-b px-2 py-1.5">
                <DropdownMenuLabel className="text-base">Filters</DropdownMenuLabel>
                <p className="text-xs text-muted-foreground">
                  Locations to show and max points you&apos;re willing to donate.
                </p>
              </div>
              {/*scrollable area for filter options*/}
              <div className="max-h-[40vh] overflow-y-auto p-2">
                {/*location filter section label*/}
                <DropdownMenuLabel className="px-2 py-1 text-xs font-normal text-muted-foreground">
                  Dining locations to show (leave all unchecked for all)
                </DropdownMenuLabel>
                {/*list of dining locations*/}
                {UCSC_LOCATIONS.map((loc) => (
                  <DropdownMenuCheckboxItem
                    key={loc}
                    checked={selectedLocations.has(loc)}
                    onCheckedChange={() => toggleLocation(loc)}
                  >
                    {loc}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator className="my-2" />
                {/*max donation filter input*/}
                <div className="space-y-1 px-2 py-1">
                  <Label htmlFor="max-donation-dropdown" className="text-xs">
                    Max I&apos;m willing to donate (points)
                  </Label>
                  <Input
                    id="max-donation-dropdown"
                    type="number"
                    min={0}
                    placeholder="No limit"
                    value={maxDonation}
                    onChange={(e) => setMaxDonation(e.target.value)}
                    className="h-8"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              {/*clears filters button when a filter is active*/}
              {(selectedLocations.size > 0 || maxDonation !== "") && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <Button variant="ghost" size="sm" className="w-full justify-center" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
            {filteredMyRequests.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-2xl font-semibold">My Requests</h2>
                <div className="space-y-4">
                  {filteredMyRequests.map((request) => (
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
              {filteredOtherRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <p>No requests available. Be the first to create one!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOtherRequests.map((request) => (
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

                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAccept(request.id)}
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
                    )}

                    {request.status === "accepted" && request.donor && (
                      <p className="text-sm text-muted-foreground">
                        Accepted by {request.donor.name || request.donor.email}
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
