//wrapper for calculator

import { getCurrentUser } from "@/lib/auth"; 
import { redirect } from "next/navigation";  
import { PageBackLink } from "@/components/page-back-link";
import { DonationCalculator } from "@/components/DonationCalculator"; //imports donation calculator component

//Async cause need to wait for user data from getCurrentUser
export default async function DonationCalculatorPage() {
  const user = await getCurrentUser(); //try to get currently logged in user
  //if there is no user or user does not have an id then they are not lgged in correctly, redirect to login.
  if (!user || !user.id) {
    redirect("/auth/login");
  }
  //if logged in then render page
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Tools
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
              Donation Calculator
            </h1>
          </div>
          <PageBackLink href="/dashboard">Back to Dashboard</PageBackLink>
        </div>
        {/* Render the actual Donation Calculator UI */}
        <DonationCalculator />
      </div>
    </div>
  );
}
