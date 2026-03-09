//wrapper for calculator

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageBackLink } from "@/components/page-back-link";
import { DonationCalculator } from "@/components/DonationCalculator";

export default async function DonationCalculatorPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/auth/login");
  }

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
        <DonationCalculator />
      </div>
    </div>
  );
}
