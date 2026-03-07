import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { ScanRequestClient } from "@/app/requests/[id]/scan/scan-request-client";

export default async function ScanRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,_#dbeafe,_transparent_35%),radial-gradient(circle_at_90%_0%,_#fef3c7,_transparent_30%),#f8fafc] p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              QR fulfillment
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Scan and Complete</h1>
          </div>
          <Link
            href="/requests"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            Back to Requests
          </Link>
        </div>
        <ScanRequestClient requestId={id} />
      </div>
    </div>
  );
}
