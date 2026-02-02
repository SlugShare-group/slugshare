"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { UpdatePhoneForm } from "@/components/UpdatePhoneForm"; // Ensure this import path is correct

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    phone?: string | null;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image ?? ""} alt={user.name ?? "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-auto min-w-[200px] max-w-[320px] p-4" align="end">
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Account Details
          </h2>
    
          <div className="space-y-2">
            {/* Name */}
            <div className="flex items-center text-sm gap-1.5">
              <span className="font-bold text-foreground whitespace-nowrap">Name:</span>
              <span className="text-muted-foreground">{user.name || "N/A"}</span>
            </div>

            {/* Email */}
            <div className="flex items-center text-sm gap-1.5">
              <span className="font-bold text-foreground whitespace-nowrap">Email:</span>
              <span className="text-muted-foreground">{user.email}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center text-sm gap-1.5">
              <span className="font-bold text-foreground whitespace-nowrap">Phone:</span>
              <UpdatePhoneForm initialPhone={user.phone} />
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-4" />

        <DropdownMenuItem
          className="text-red-600 cursor-pointer font-bold focus:text-red-600"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}