import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ScanPageClient from "@/app/scan/[id]/scan-page-client";

export default async function ScanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;

  return <ScanPageClient requestId={id} />;
}
