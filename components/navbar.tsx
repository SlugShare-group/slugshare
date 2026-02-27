import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "./ui/button";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-8">
        <Link 
          href={user ? "/dashboard" : "/"} 
          className="text-xl font-bold tracking-tight"
        >
          SlugShare
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* inbox and profile only show if logged in */}
              <Button asChild variant="ghost" size="sm">
                <Link href="/inbox">Inbox</Link>
              </Button>
              {/* profile menu inside flex container */}
              <UserMenu user={user} />
            </>
          ) : (
            null
          )}
        </div>
      </div>
    </header>
  );
}