import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LoginPageClient from "./login-page-client";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    // Only redirect to dashboard if the user actually exists in the database
    // This prevents a redirect loop when the JWT references a deleted user
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (dbUser) {
      redirect("/dashboard");
    }
  }

  return <LoginPageClient />;
}
