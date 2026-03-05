//wrapper for calculator

import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DonationCalculator } from "@/components/DonationCalculator";

export default async function DonationCalculatorPage() {
  // get current user 
  const user = await getCurrentUser();


  if (!user || !user.id) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <DonationCalculator />
      </div>
    </div>
  );
}
