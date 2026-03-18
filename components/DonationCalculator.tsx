"use client"; //marks as client component in next.js, is needed because of the react hooks useState and useEffect
// used for managing states and API fetching
import { useEffect, useState } from "react";
// used to structure page layout
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
//from quarter.ts, utilities for determining active quarter and remaining days
import {
  getCurrentQuarter,
  getDaysRemainingInQuarter,
  QUARTERS,
} from "@/lib/quarters";
import { Calendar } from "lucide-react";
// Components from rechart to build a graph
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DonationPace = "evenly" | "now" | "end";

  // Convert year-month-day string to month day, year 
  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  
  export function DonationCalculator() {
    // users dining point balance from backend
    const [balance, setBalance] = useState<number | null>(null);
    // user entered average points spent per day on food
    const [avgDailySpending, setAvgDailySpending] = useState("");
    // how to spread donations over the quarter
    const [donationPace, setDonationPace] = useState<DonationPace>("evenly");
    // loading and error states 
    const [isLoadingBalance, setIsLoadingBalance] = useState(true);
    const [balanceError, setBalanceError] = useState("");

    // this only shows the calculator during an active quarter as students dont have points between quarters
    const currentQuarter = getCurrentQuarter();
    // days remaining if quarter is active
    const daysRemaining =
      currentQuarter !== null ? getDaysRemainingInQuarter(new Date()) : 0;

    // get user points balance
    useEffect(() => {
      const fetchBalance = async () => {
        try {
          //show loading state while request is in progress
          setIsLoadingBalance(true);
          setBalanceError("");
          //fetch users diing points from api
          const res = await fetch("/api/points");
          //handle a non success responnse
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setBalanceError(data.error || "Failed to load balance");
            setBalance(null);
            return;
          }
          //successful response
          const data = await res.json();
          setBalance(data.balance);
        } catch {
          // network failure or unexpected failure
          setBalanceError("Failed to load balance");
          setBalance(null);
        } finally {
          // stop loading indicator
          setIsLoadingBalance(false);
        }
      };
      fetchBalance();
    }, []);

    // if not in a quarter show message
    if (currentQuarter === null) {
      return (
        <>
          <h1 className="mb-2 text-3xl font-bold">Donation Calculator</h1>
          <p className="mb-6 text-muted-foreground">
            Plan how many points you can donate without affecting your own spending.
          </p>
          <Card className="border-border bg-card/90 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5" />
                Not Currently in a Quarter
              </CardTitle>
              <CardDescription>
                The donation calculator is only available during an active
                academic quarter. Points reset every quarter, so students use
                this tool to plan donations before the quarter ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Upcoming quarters:</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {QUARTERS.map((q) => (
                    <li key={q.name}>
                      {q.name}: {formatDate(q.start)} – {formatDate(q.end)}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      );
    }

    // calculator logic
    //convert user input into num
    const avgSpendingNum =
      avgDailySpending === ""
        ? null
        : parseFloat(avgDailySpending);
    // cant be negative or null
    const avgSpendingValid =
      avgSpendingNum !== null &&
      !Number.isNaN(avgSpendingNum) &&
      avgSpendingNum >= 0;

    // points needed to cover your own food for the rest of the quarter
    const pointsNeededForSelf =
      avgSpendingValid && balance !== null
        ? Math.ceil(avgSpendingNum! * daysRemaining)
        : null;
    // balance minus points needed for yourself = how much you can safely donate
    const totalDonatable =
      pointsNeededForSelf !== null && balance !== null
        ? Math.max(0, balance - pointsNeededForSelf)
        : null;
    // how much you can donate daily
    const dailyDonatable =
      totalDonatable !== null && daysRemaining > 0
        ? Math.floor(totalDonatable / daysRemaining)
        : null;

    // creates chart data: projected balance over time
    const chartData =
      avgSpendingValid &&
      balance !== null &&
      pointsNeededForSelf !== null &&
      totalDonatable !== null &&
      dailyDonatable !== null &&
      daysRemaining > 0
        ? Array.from({ length: daysRemaining + 1 }, (_, day) => {
            //balance if the user does not donate 
            const withoutDonating = Math.max(
              0,
              balance - avgSpendingNum! * day
            );
            // balance if the user does donate depending on the pace chosen
            let withDonating: number;
            switch (donationPace) {
              case "evenly":
                withDonating = Math.max(
                  0,
                  balance - (avgSpendingNum! + dailyDonatable) * day
                );
                break;
              case "now":
                withDonating = Math.max(
                  0,
                  balance - totalDonatable - avgSpendingNum! * day
                );
                break;
              case "end":
                if (day < daysRemaining) {
                  withDonating = Math.max(
                    0,
                    balance - avgSpendingNum! * day
                  );
                } else {
                  withDonating = Math.max(
                    0,
                    balance -
                      avgSpendingNum! * daysRemaining -
                      totalDonatable
                  );
                }
                break;
              default:
                withDonating = withoutDonating;
            }
            return {
              day,
              label: day === 0 ? "Today" : day === daysRemaining ? "End" : `Day ${day}`,
              withoutDonating,
              withDonating,
            };
          })
        : [];

    // Build daily amounts chart data: shows daily spending vs daily donations
    const dailyAmountsData =
      avgSpendingValid &&
      balance !== null &&
      totalDonatable !== null &&
      dailyDonatable !== null &&
      daysRemaining > 0
        ? Array.from({ length: daysRemaining }, (_, day) => {
            let dailyDonation: number;
            switch (donationPace) {
              case "evenly":
                dailyDonation = dailyDonatable;
                break;
              case "now":
                dailyDonation = day === 0 ? totalDonatable : 0;
                break;
              case "end":
                dailyDonation = day === daysRemaining - 1 ? totalDonatable : 0;
                break;
              default:
                dailyDonation = 0;
            }
            return {
              day: day + 1,
              label: day === 0 ? "Day 1" : day === daysRemaining - 1 ? "Last day" : `Day ${day + 1}`,
              dailySpending: avgSpendingNum!,
              dailyDonation,
            };
          })
        : [];

    // show the calculator
    return (
      <>
        <h1 className="mb-2 text-3xl font-bold">Donation Calculator</h1>
        <p className="mb-6 text-muted-foreground">
          Plan how many points you can donate without affecting your own spending.
        </p>
        <div className="mb-6 rounded-lg border bg-muted/50 px-4 py-3">
          <p className="text-sm font-medium">{currentQuarter.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(currentQuarter.start)} – {formatDate(currentQuarter.end)} •
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        </div>
        <Card className="mb-6 border-border bg-card/90 shadow-xl shadow-black/5 dark:shadow-black/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Read-only: balance comes from /api/points */}
            <div className="space-y-2">
              <Label htmlFor="balance">Current balance (points)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="balance"
                  type="text"
                  readOnly
                  value={
                    isLoadingBalance
                      ? "Loading..."
                      : balanceError
                        ? "Error loading"
                        : balance !== null
                          ? balance.toString()
                          : ""
                  }
                  className="bg-muted"
                />
                {balanceError && (
                  <span className="text-sm text-destructive">{balanceError}</span>
                )}
              </div>
            </div>

            {/* User inputs this to estimate how much they need for themselves */}
            <div className="space-y-2">
              <Label htmlFor="avg-spending">
                Average daily spending (points per day)
              </Label>
              <Input
                id="avg-spending"
                type="number"
                min="0"
                step="1"
                placeholder=" "
                value={avgDailySpending}
                onChange={(e) => setAvgDailySpending(e.target.value)}
              />
              
            </div>

            {/* Donation pace selector that is only available when user can donate */}
            {avgSpendingValid &&
              balance !== null &&
              totalDonatable !== null &&
              totalDonatable > 0 && (
                <div className="space-y-2">
                  <Label>Donation pace</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { value: "evenly" as const, label: "Evenly over quarter" },
                        { value: "now" as const, label: "Donate now (all at once)" },
                        { value: "end" as const, label: "Donate at end" },
                      ] satisfies { value: DonationPace; label: string }[]
                    ).map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={donationPace === opt.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDonationPace(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    When do you want to donate your extra points?
                  </p>
                </div>
              )}

            {/* Show results only when there is a input and balance */}
            {avgSpendingValid && balance !== null && (
              <div className="space-y-4 rounded-lg border bg-background p-4">
                <h3 className="font-semibold">Results</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Points needed for yourself
                    </p>
                    <p className="text-xl font-bold">
                      {pointsNeededForSelf?.toLocaleString()} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {avgSpendingNum} × {daysRemaining} days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total you can donate
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {totalDonatable?.toLocaleString()} pts
                    </p>
                    {dailyDonatable !== null && daysRemaining > 1 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {dailyDonatable} pts per day
                      </p>
                    )}
                  </div>
                </div>

                {/* Projected balance line graph */}
                
                {chartData.length > 0 && (
                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-medium">
                      Projected balance over time
                    </h4>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {/* Main chart component takes in computed data */}
                        <LineChart
                          data={chartData} //array of our computed data
                          margin={{ top: 5, right: 5, left: 0, bottom: 5 }} //chart spacing
                        >
                          {/* Background grid lines, easier to read on*/}
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="label" // uses label field from chartData so  "Day 1", "End" 
                            //style for axis text
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            //control how many labels are shown, less crowing
                            interval={
                              daysRemaining > 30
                                ? Math.floor(daysRemaining / 10)
                                : daysRemaining > 14
                                  ? 2
                                  : 0 //show all if small rnage
                            }
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            // Formats values adds "pts" later in tooltip instead
                            tickFormatter={(v) => `${v}`}
                          />
                          {/* Tooltip shows exact values when hovering over the graph */}
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)",
                            }}
                            // Formats tooltip text "200 pts"
                            formatter={(value, name) => [`${value ?? 0} pts`, name]}
                          />
                          {/* which line is which */}
                          <Legend />
                          <Line
                            type="monotone" //smooth curve
                            dataKey="withoutDonating" //uses field from chart data
                            stroke="hsl(217, 91%, 60%)" //blue line
                            strokeWidth={2}
                            dot={false} //removes dots at each point
                            name="Without donating"
                          />
                          <Line
                            type="monotone"
                            dataKey="withDonating"
                            stroke="hsl(142, 71%, 45%)"
                            strokeWidth={2}
                            dot={false}
                            name="With donating"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </>
    );
  }
