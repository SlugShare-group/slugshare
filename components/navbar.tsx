import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle"; // Import the toggle here

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

        <div className="flex items-center gap-2">
          {/* ModeToggle works here because it is a Client Component leaf */}
          <ModeToggle />

          {user ? (
            <div className="flex items-center gap-4 ml-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/inbox">Inbox</Link>
              </Button>
              <UserMenu user={user} />
            </div>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}