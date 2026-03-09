import { NextRequest } from "next/server";
import { signOut } from "@/auth";

// This route is used when we detect a stale JWT (session user exists
// but the corresponding DB user has been deleted).
// Route Handlers are allowed to modify cookies, so we clear the session
// here and redirect back to the login page.
export async function GET(_req: NextRequest) {
  await signOut({ redirectTo: "/auth/login" });
}

