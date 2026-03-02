import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { GetPageClient } from "@/app/get/get-page-client";

export default async function GetManagementPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef3c7,_#f8fafc_40%)] p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              GET integration
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
              Link and Monitor GET Session
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>
        <GetPageClient />
      </div>
    </div>
  );
}
