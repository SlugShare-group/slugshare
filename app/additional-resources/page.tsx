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

//helper functions
const getDayKey = () => {
  const days = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'] as const;
  return days[new Date().getDay()];
};

const isCurrentlyOpen = (schedule: any) => {
  if (!schedule) return false;

  const dayKey = getDayKey();
  const today = schedule[dayKey];
  
  //if no schedule
  if (!today){
    return false;
  }
  
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  //array-based schedules
  if (Array.isArray(today)) {
    return today.some(window => {
      const openTime = parseInt(window.open.replace(":", ""));
      const closeTime = parseInt(window.close.replace(":", ""));
      return currentTime >= openTime && currentTime < closeTime;
    });
  }

  //single Object schedules
  const openTime = parseInt(today.open.replace(":", ""));
  const closeTime = parseInt(today.close.replace(":", ""));
  return currentTime >= openTime && currentTime < closeTime;
};

export default function CreateRequestPage() {
  const router = useRouter();
  
  //state hooks
  const [location, setLocation] = useState<string>(""); 
  const [pointsRequested, setPointsRequested] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  //hydration states
  const [isClient, setIsClient] = useState(false);
  const [dayKey, setDayKey] = useState<"sun" | "mon" | "tues" | "wed" | "thurs" | "fri" | "sat">("mon");

  const selectedLocationData = UCSC_LOCATIONS_DATA.find(loc => loc.name === location);

  useEffect(() => {
    setIsClient(true);
    setDayKey(getDayKey());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Additional Resources</h1>
          <p className="text-sm text-muted-foreground">
            Explore free food pantries and community services at UCSC.
          </p>
        </div>

          <div className="space-y-2">
            <Accordion type="single" collapsible className="w-full border rounded-md px-4">
              {["Services", "Food Pantries"].map((category) => (
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
                        .map((item: any) => {
                          return (
                            <div key={item.name} className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => setLocation(location === item.name ? "" : item.name)}
                                className={`flex items-center justify-between p-3 text-sm rounded-md transition-all border ${
                                  location === item.name 
                                    ? "bg-primary text-primary-foreground border-primary" 
                                    : "hover:bg-accent border-transparent"
                                }`}
                              >
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold">{item.name}</span>
                                  <span className="text-[10px] opacity-80">
                                    {item.category === "Service" ? (
                                      "Custom Availability"
                                    ) : item.customNote ? (
                                      item.customNote
                                    ) : !item.isOpen ? (
                                      <span className="text-destructive font-medium">Currently Closed</span>
                                    ) : (
                                      `Open until ${Array.isArray(item.schedule[dayKey]) 
                                        ? item.schedule[dayKey][0].close 
                                        : item.schedule[dayKey].close}`
                                    )}
                                  </span>
                                </div>
                                {/* expandable visual indicator */}
                                <div className={`transition-transform ${location === item.name ? "rotate-180" : ""}`}>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                              </button>

                              {location === item.name && (
                                <div className="px-3 pb-3 pt-1 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1">
                                  {item.description && <p className="mb-3 leading-relaxed">{item.description}</p>}
                                  
                                  {item.schedule[dayKey]?.displayLocation && (
                                    <p className="mb-2 font-medium text-primary">
                                      📍 Today's Location: {item.schedule[dayKey].displayLocation}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap gap-3">
                                    {(item.mapURL || item.schedule[dayKey]?.mapURL) && (
                                      <a 
                                        href={item.schedule[dayKey]?.mapURL || item.mapURL} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                                      >
                                        📍{item.schedule[dayKey]?.displayLocation || item.location || 'Location'}
                                      </a>
                                    )}
                                    {item.siteURL && (
                                      <a 
                                        href={item.siteURL} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:underline font-medium"
                                      >
                                        Website →
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
      </div>
    </div>
  );
}