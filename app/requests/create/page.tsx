"use client";

import { useEffect, useState } from "react";
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
import { UCSC_LOCATIONS_DATA, DINING_HALL_PRICES } from "@/lib/locations";
import { Clock, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

// Helper functions stay outside
const getDayKey = () => {
  const days = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'] as const;
  return days[new Date().getDay()];
};

const getMealPeriod = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'lateNight';
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
  return currentTime >= openTime && currentTime <= closeTime;
};

export default function CreateRequestPage() {
  const router = useRouter();
  
  // 1. State hooks must be at the top level of the component
  const [location, setLocation] = useState<string>(""); 
  const [pointsRequested, setPointsRequested] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Hydration states
  const [isClient, setIsClient] = useState(false);
  const [currentMeal, setCurrentMeal] = useState("lunch");
  const [dayKey, setDayKey] = useState<"sun" | "mon" | "tues" | "wed" | "thurs" | "fri" | "sat">("mon");

  // 2. Derived state (isDiningHall) must be inside the component
  const selectedLocationData = UCSC_LOCATIONS_DATA.find(loc => loc.name === location);
  const isDiningHall = selectedLocationData?.standardPricing || false;

  useEffect(() => {
    setIsClient(true);
    setCurrentMeal(getMealPeriod());
    setDayKey(getDayKey());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let points: number;

      // Automatically set points for Dining Halls
      if (isDiningHall) {
        const meal = getMealPeriod();
        points = DINING_HALL_PRICES.slugPoints[meal as keyof typeof DINING_HALL_PRICES.slugPoints];
      } else {
        points = parseInt(pointsRequested, 10);
      }

      if (!location) {
        setError("Location is required");
        setIsLoading(false);
        return;
      }

      if (isNaN(points) || points <= 0) {
        setError("Points requested must be a positive number");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: location.trim(),
          pointsRequested: points,
          message: message.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to create request");
        setIsLoading(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/requests");
    } catch (error) {
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
            <CardTitle>Create Request</CardTitle>
                        
            <Button variant="outline" size="sm" asChild>
            <a 
              href="https://nutrition.sa.ucsc.edu/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs"
            >
              View UCSC Menus
            </a>
          </Button>          
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
                {location && (
                  <div className="text-sm font-medium text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded-md border border-green-200">
                    <Check className="h-4 w-4" /> Selected: {location}
                    {isDiningHall && isClient && (
                        <span className="ml-auto font-bold">
                            Cost: ${DINING_HALL_PRICES.slugPoints[currentMeal as keyof typeof DINING_HALL_PRICES.slugPoints].toFixed(2)}
                        </span>
                    )}
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

                              return (
                                <button
                                  key={item.name}
                                  type="button"
                                  disabled={!item.isOpen}
                                  onClick={() => setLocation(item.name)}
                                  className={`flex items-center justify-between p-3 text-sm rounded-md transition-all border ${
                                    !item.isOpen
                                      ? "opacity-50 bg-muted cursor-not-allowed border-transparent"
                                      : location === item.name
                                      ? "bg-primary text-primary-foreground border-primary font-medium"
                                      : "hover:bg-accent border-transparent"
                                  }`}
                                >
                                  <div className="flex flex-col text-left">
                                    <span className="font-semibold">{item.name}</span>
                                    <span className="text-[10px] flex items-center gap-1">
                                      {!item.isOpen ? "Currently Closed" : `Open until ${item.schedule[dayKey]?.close}`}
                                    </span>
                                  </div>
                                  {price && item.isOpen && (
                                    <div className="text-right flex flex-col items-end">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground">{currentMeal}</span>
                                      <span className="font-mono font-bold">${price.toFixed(2)}</span>
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

              {/* Points input only shows if NOT a dining hall */}
              {!isDiningHall && (
                <div className="space-y-2">
                  <Label htmlFor="points">Points Requested</Label>
                  <Input
                    id="points"
                    type="number"
                    min="1"
                    value={pointsRequested}
                    onChange={(e) => setPointsRequested(e.target.value)}
                    placeholder="Enter points amount"
                    required={!isDiningHall}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add any additional details..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Creating..." : "Create Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/requests")}>
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