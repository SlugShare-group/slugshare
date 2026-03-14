import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageBackLink } from "@/components/page-back-link";
import { GetPageClient } from "@/app/get/get-page-client";

export default async function GetManagementPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              GET integration
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
              Link and Monitor GET Session
            </h1>
          </div>
          <PageBackLink href="/dashboard">Back to Dashboard</PageBackLink>
        </div>
        <GetPageClient />
      </div>
    </div>
  );
}
