import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TestingPageClient from "@/app/testing/testing-page-client";

export default async function TestingPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  return <TestingPageClient />;
}
