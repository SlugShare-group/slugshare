import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-8">
        {/* if no user: landing page or login; if user: dashboard */}
        <Link 
          href={user ? "/dashboard" : "/"} 
          className="text-xl font-bold tracking-tight"
        >
          SlugShare
        </Link>

        {/* hide profile menu on login page */}
        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}