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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input"; //used for entering the maximum donation amount
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import { PageBackLink } from "@/components/page-back-link";
import { UCSC_LOCATIONS_DATA, DINING_HALL_PRICES } from "@/lib/locations"; //all available dining locations

// Helper functions for location open/close status
const getDayKey = () => {
  const days = ["sun", "mon", "tues", "wed", "thurs", "fri", "sat"] as const;
  return days[new Date().getDay()];
};

const getMealPeriod = () => {
  const now = new Date();
  const time = now.getHours() + now.getMinutes() / 60;
  if (time >= 7 && time < 11) return "breakfast";
  if (time >= 11.5 && time < 14) return "lunch";
  if (time >= 17 && time < 20) return "dinner";
  if (time >= 20 && time < 23) return "lateNight";
  return "continuousDining";
};

const isCurrentlyOpen = (schedule: any) => {
  if (!schedule) return false;
  const dayKey = getDayKey();
  const today = schedule[dayKey];
  if (!today) return false;
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const openTime = parseInt(today.open.replace(":", ""));
  const closeTime = parseInt(today.close.replace(":", ""));
  return currentTime >= openTime && currentTime < closeTime;
};

type DayKey = "sun" | "mon" | "tues" | "wed" | "thurs" | "fri" | "sat";
type OpenCloseWindow = { open: string; close: string };

function isOpenCloseWindow(value: unknown): value is OpenCloseWindow {
  return (
      !!value &&
      typeof value === "object" &&
      "open" in value &&
      "close" in value &&
      typeof (value as OpenCloseWindow).open === "string" &&
      typeof (value as OpenCloseWindow).close === "string"
  );
}

function getCloseTimeFromSchedule(schedule: unknown, dayKey: DayKey): string | null {
  if (!schedule || typeof schedule !== "object") return null;
  const dayValue = (schedule as Record<string, unknown>)[dayKey];
  if (!dayValue) return null;
  if (Array.isArray(dayValue)) {
    const lastWindow = dayValue.at(-1);
    return isOpenCloseWindow(lastWindow) ? lastWindow.close : null;
  }
  if (isOpenCloseWindow(dayValue)) return dayValue.close;
  return null;
}

interface Request {
  id: string;
  requesterId: string;
  donorId: string | null;
  location: string;
  pointsRequested: number;
  status: string;
  selectedFulfillmentMode: "in_person" | "qr_code" | null;
  completedAt: string | null;
  completionReason: string | null;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  inPersonAllowed: boolean;
  qrCodeAllowed: boolean;
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
  const [acceptModeRequest, setAcceptModeRequest] = useState<Request | null>(null);
  // filters requests based on locations and max amount willing to donate
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [maxDonation, setMaxDonation] = useState<string>("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    location: "",
    pointsRequested: 0,
    message: "",
    inPersonAllowed: true,
    qrCodeAllowed: false,
  });

  // Hydration-safe state for location picker
  const [isClient, setIsClient] = useState(false);
  const [currentMeal, setCurrentMeal] = useState("lunch");
  const [editDayKey, setEditDayKey] = useState<DayKey>("mon");

  useEffect(() => {
    setIsClient(true);
    setCurrentMeal(getMealPeriod());
    setEditDayKey(getDayKey());
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

  const handleAccept = async (
      requestId: string,
      mode: "in_person" | "qr_code"
  ) => {
    if (processingId) return;

    try {
      setProcessingId(requestId);
      const response = await fetch(`/api/requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
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
      setAcceptModeRequest(null);
    }
  };

  const handleAcceptClick = (request: Request) => {
    const supportsInPerson = request.inPersonAllowed;
    const supportsQr = request.qrCodeAllowed;

    if (supportsInPerson && supportsQr) {
      setAcceptModeRequest(request);
      return;
    }

    if (supportsQr) {
      void handleAccept(request.id, "qr_code");
      return;
    }

    void handleAccept(request.id, "in_person");
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


  const handleEditClick = (request: Request) => {
    setEditingId(request.id);
    setEditForm({
      location: request.location,
      pointsRequested: request.pointsRequested,
      message: request.message || "",
      inPersonAllowed: request.inPersonAllowed,
      qrCodeAllowed: request.qrCodeAllowed,
    });
  };

  const handleEditSave = async (requestId: string) => {
    if (processingId) return;
    if (!editForm.inPersonAllowed && !editForm.qrCodeAllowed) {
      alert("Please select at least one fulfillment option.");
      return;
    }
    // Auto-price dining halls like the create page does
    const locData = UCSC_LOCATIONS_DATA.find(l => l.name === editForm.location);
    const isDiningHall = locData?.standardPricing || false;
    const points = isDiningHall
        ? DINING_HALL_PRICES.slugPoints[getMealPeriod() as keyof typeof DINING_HALL_PRICES.slugPoints]
        : Number(editForm.pointsRequested);
    try {
      setProcessingId(requestId);
      const response = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: editForm.location,
          pointsRequested: points,
          message: editForm.message,
          inPersonAllowed: editForm.inPersonAllowed,
          qrCodeAllowed: editForm.qrCodeAllowed,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to edit request");
        return;
      }
      setEditingId(null);
      await fetchRequests();
      router.refresh();
    } catch (error) {
      console.error("Error editing request:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  // Prevent unchecking if it would leave both unchecked
  const handleFulfillmentChange = (field: "inPersonAllowed" | "qrCodeAllowed", checked: boolean) => {
    const otherField = field === "inPersonAllowed" ? "qrCodeAllowed" : "inPersonAllowed";
    if (!checked && !editForm[otherField]) return;
    setEditForm((f) => ({ ...f, [field]: checked }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "text-green-600";
      case "completed":
        return "text-blue-600";
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
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Requests
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
              All Requests
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <PageBackLink href="/dashboard">Back to Dashboard</PageBackLink>
            <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
              Refresh
            </Button>
            <Button asChild>
              <Link href="/requests/create">Create Request</Link>
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-4"> {/*Page header and filter controls container*/}

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
                {UCSC_LOCATIONS_DATA.map((loc) => (
                    <DropdownMenuCheckboxItem
                        key={loc.name}
                        checked={selectedLocations.has(loc.name)}
                        onCheckedChange={() => toggleLocation(loc.name)}
                    >
                      {loc.name}
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
                          <Card key={request.id} className="border-border bg-card/90 shadow-lg shadow-black/5 dark:shadow-black/20">
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
                                <p className="text-sm text-muted-foreground">
                                  Fulfillment:{" "}
                                  <span className="font-medium">
                                    {request.inPersonAllowed && "In person"}
                                    {request.inPersonAllowed &&
                                        request.qrCodeAllowed &&
                                        " & "}
                                    {request.qrCodeAllowed && "QR code"}
                                  </span>
                                </p>
                                {request.message && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">
                                        {request.message}
                                      </p>
                                    </div>
                                )}

                                {request.status === "accepted" && request.donor && (
                                    <p className="text-sm text-muted-foreground">
                                      Accepted by {request.donor.name || request.donor.email} (
                                      {request.selectedFulfillmentMode === "qr_code" ? "QR mode" : "in-person"}
                                      )
                                    </p>
                                )}

                                {request.status === "accepted" &&
                                    request.selectedFulfillmentMode === "qr_code" && (
                                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                          This request is in active QR fulfillment mode.
                                          <div className="mt-2">
                                            <Button asChild size="sm" variant="outline">
                                              <Link href={`/requests/${request.id}/scan`}>Open Scan Screen</Link>
                                            </Button>
                                          </div>
                                        </div>
                                    )}

                                {request.status === "completed" && (
                                    <p className="text-sm text-muted-foreground">
                                      Completed
                                      {request.completedAt
                                          ? ` on ${new Date(request.completedAt).toLocaleString()}`
                                          : ""}
                                    </p>
                                )}

                                {request.status === "declined" && request.donor && (
                                    <p className="text-sm text-muted-foreground">
                                      Declined by {request.donor.name || request.donor.email}
                                    </p>
                                )}

                                {/* Edit and Delete buttons for pending requests */}
                                {request.status === "pending" && (
                                    <div className="flex flex-col gap-2">
                                      {editingId === request.id ? (
                                          <div className="flex flex-col gap-4 rounded-md border p-4 mt-1">
                                            {/* Location accordion picker */}
                                            <div className="space-y-2">
                                              <Label>Location</Label>
                                              {editForm.location && (
                                                  <div className="text-sm font-medium text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded-md border border-green-200">
                                                    <Check className="h-4 w-4" /> Selected: {editForm.location}
                                                    {(() => {
                                                      const locData = UCSC_LOCATIONS_DATA.find(l => l.name === editForm.location);
                                                      if (locData?.standardPricing) {
                                                        return (
                                                            <span className="ml-auto font-bold">
                                                              Cost: ${DINING_HALL_PRICES.slugPoints[currentMeal as keyof typeof DINING_HALL_PRICES.slugPoints]}
                                                            </span>
                                                        );
                                                      }
                                                    })()}
                                                  </div>
                                              )}
                                              <Accordion type="single" collapsible className="w-full border rounded-md px-4">
                                                {["Dining Halls", "Markets", "Perks Coffee Bar", "Cafes and Restaurants"].map((category) => (
                                                    <AccordionItem key={category} value={category} className="border-b-0">
                                                      <AccordionTrigger className="text-sm hover:no-underline py-3">
                                                        {category}
                                                      </AccordionTrigger>
                                                      <AccordionContent>
                                                        <div className="grid grid-cols-1 gap-2 pb-2">
                                                          {isClient && UCSC_LOCATIONS_DATA
                                                              .filter((loc) => loc.category === category)
                                                              .map((loc) => ({
                                                                ...loc,
                                                                isOpen: isCurrentlyOpen(loc.schedule),
                                                              }))
                                                              .sort((a, b) => Number(b.isOpen) - Number(a.isOpen))
                                                              .map((item) => {
                                                                const price = item.standardPricing
                                                                    ? DINING_HALL_PRICES.slugPoints[currentMeal as keyof typeof DINING_HALL_PRICES.slugPoints]
                                                                    : null;
                                                                const closeTime = getCloseTimeFromSchedule(item.schedule, editDayKey);
                                                                return (
                                                                    <button
                                                                        key={item.name}
                                                                        type="button"
                                                                        disabled={!item.isOpen}
                                                                        onClick={() => setEditForm((f) => ({ ...f, location: item.name }))}
                                                                        className={`flex items-center justify-between p-3 text-sm rounded-md transition-all border ${
                                                                            !item.isOpen
                                                                                ? "opacity-50 bg-muted cursor-not-allowed border-transparent"
                                                                                : editForm.location === item.name
                                                                                    ? "bg-primary text-primary-foreground border-primary font-medium"
                                                                                    : "hover:bg-accent border-transparent"
                                                                        }`}
                                                                    >
                                                                      <div className="flex flex-col text-left">
                                                                        <span className="font-semibold">{item.name}</span>
                                                                        <span className="text-[10px] flex items-center gap-1">
                                                                          {!item.isOpen ? "Currently Closed" : `Open until ${closeTime ?? "end of service"}`}
                                                                        </span>
                                                                      </div>
                                                                      {price && item.isOpen && (
                                                                          <div className="text-right flex flex-col items-end">
                                                                            <span className="text-[9px] uppercase font-bold text-muted-foreground">{currentMeal}</span>
                                                                            <span className="font-mono font-bold">${price}</span>
                                                                          </div>
                                                                      )}
                                                                    </button>
                                                                );
                                                              })}
                                                        </div>
                                                      </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                              </Accordion>
                                            </div>

                                            {/* Points - hidden for dining halls (auto-priced) */}
                                            {!UCSC_LOCATIONS_DATA.find(l => l.name === editForm.location)?.standardPricing && (
                                                <div className="space-y-2">
                                                  <Label>Points Requested</Label>
                                                  <Input
                                                      type="number"
                                                      min="1"
                                                      step="1"
                                                      value={editForm.pointsRequested}
                                                      onChange={(e) => setEditForm((f) => ({ ...f, pointsRequested: parseInt(e.target.value) || 0 }))}
                                                  />
                                                </div>
                                            )}

                                            {/* Message */}
                                            <div className="space-y-2">
                                              <Label>Message (optional)</Label>
                                              <textarea
                                                  className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                  value={editForm.message}
                                                  onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                                              />
                                            </div>

                                            {/* Fulfillment - at least one must stay checked */}
                                            <div className="space-y-2">
                                              <Label>How can this request be fulfilled?</Label>
                                              <div className="flex flex-col gap-2 text-sm">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                      type="checkbox"
                                                      checked={editForm.inPersonAllowed}
                                                      onChange={(e) => handleFulfillmentChange("inPersonAllowed", e.target.checked)}
                                                  />
                                                  Meet in person
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                  <input
                                                      type="checkbox"
                                                      checked={editForm.qrCodeAllowed}
                                                      onChange={(e) => handleFulfillmentChange("qrCodeAllowed", e.target.checked)}
                                                  />
                                                  Receive QR code
                                                </label>
                                              </div>
                                            </div>

                                            <div className="flex gap-2">
                                              <Button onClick={() => handleEditSave(request.id)} disabled={processingId === request.id} size="sm">
                                                {processingId === request.id ? "Saving..." : "Save"}
                                              </Button>
                                              <Button onClick={() => setEditingId(null)} disabled={processingId === request.id} variant="outline" size="sm">
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                      ) : (
                                          <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleEditClick(request)}
                                                disabled={processingId === request.id}
                                                variant="outline"
                                                size="sm"
                                            >
                                              Edit
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(request.id)}
                                                disabled={processingId === request.id}
                                                variant="destructive"
                                                size="sm"
                                            >
                                              {processingId === request.id ? "Deleting..." : "Delete"}
                                            </Button>
                                          </div>
                                      )}
                                    </div>
                                )}
                                {/* Allow deleting QR-mode accepted requests */}
                                {request.status !== "pending" && request.selectedFulfillmentMode === "qr_code" && (
                                    <div className="flex gap-2">
                                      <Button
                                          onClick={() => handleDelete(request.id)}
                                          disabled={processingId === request.id}
                                          variant="destructive"
                                          size="sm"
                                      >
                                        {processingId === request.id ? "Deleting..." : "Delete"}
                                      </Button>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Created {new Date(request.createdAt).toLocaleString()}
                                </p>
                                {new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime() > 5000 && (
                                    <p className="text-xs text-muted-foreground">
                                      Edited {new Date(request.updatedAt).toLocaleString()}
                                    </p>
                                )}
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
                    <Card className="border-border bg-card/90 shadow-lg shadow-black/5 dark:shadow-black/20">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <p>No requests available. Be the first to create one!</p>
                      </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                      {filteredOtherRequests.map((request) => (
                          <Card key={request.id} className="border-border bg-card/90 shadow-lg shadow-black/5 dark:shadow-black/20">
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
                                <p className="text-sm text-muted-foreground">
                                  Fulfillment:{" "}
                                  <span className="font-medium">
                                    {request.inPersonAllowed && "In person"}
                                    {request.inPersonAllowed &&
                                        request.qrCodeAllowed &&
                                        " & "}
                                    {request.qrCodeAllowed && "QR code"}
                                  </span>
                                </p>
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
                                          onClick={() => handleAcceptClick(request)}
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
                                      Accepted by {request.donor.name || request.donor.email} (
                                      {request.selectedFulfillmentMode === "qr_code" ? "QR mode" : "in-person"})
                                    </p>
                                )}

                                {request.status === "completed" && request.donor && (
                                    <p className="text-sm text-muted-foreground">
                                      Completed by {request.donor.name || request.donor.email}
                                    </p>
                                )}

                                <p className="text-xs text-muted-foreground">
                                  Created {new Date(request.createdAt).toLocaleString()}
                                </p>
                                {new Date(request.updatedAt).getTime() - new Date(request.createdAt).getTime() > 5000 && (
                                    <p className="text-xs text-muted-foreground">
                                      Edited {new Date(request.updatedAt).toLocaleString()}
                                    </p>
                                )}
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
      {acceptModeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
            <Card className="w-full max-w-md border-2 border-border bg-card shadow-xl">
              <CardHeader>
                <CardTitle>Choose Fulfillment Mode</CardTitle>
                <CardDescription>
                  Pick how you want to fulfill {acceptModeRequest.requester.name || acceptModeRequest.requester.email}
                  &apos;s request at {acceptModeRequest.location}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                    className="w-full justify-start"
                    onClick={() => handleAccept(acceptModeRequest.id, "in_person")}
                    disabled={processingId === acceptModeRequest.id}
                >
                  Meet In Person (instant transfer)
                </Button>
                <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => handleAccept(acceptModeRequest.id, "qr_code")}
                    disabled={processingId === acceptModeRequest.id}
                >
                  QR Code Flow (balance-drop completion)
                </Button>
                <Button
                    className="w-full"
                    variant="ghost"
                    onClick={() => setAcceptModeRequest(null)}
                    disabled={processingId === acceptModeRequest.id}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
      )}
    </div>
  );
}
