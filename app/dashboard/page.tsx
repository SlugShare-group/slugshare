import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { GetBalanceCard } from "@/components/get-balance-card";
import {
  FilePlus2,
  List,
  Calculator,
  BookOpen,
  Plug,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user || !user.id) {
    redirect("/auth/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    redirect("/auth/logout-stale");
  }

  const actions = [
    {
      href: "/requests/create",
      title: "Create Request",
      description: "Request dining points at a location",
      icon: FilePlus2,
    },
    {
      href: "/requests",
      title: "View All Requests",
      description: "Browse and accept or decline requests",
      icon: List,
    },
    {
      href: "/donation-calculator",
      title: "Donation Calculator",
      description: "See how much you can donate",
      icon: Calculator,
    },
    {
      href: "/additional-resources",
      title: "Additional Resources",
      description: "Food pantries and community services",
      icon: BookOpen,
    },
    {
      href: "/get",
      title: "GET Integration",
      description: "Link and monitor your GET session",
      icon: Plug,
    },
  ] as const;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
            Welcome back
          </h1>
        </header>

        <section className="mb-10">
          <GetBalanceCard />
        </section>

        <section>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Quick actions
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {actions.map(({ href, title, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col rounded-2xl border border-border bg-card/90 p-5 shadow-lg shadow-black/5 backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-xl dark:shadow-black/20"
              >
                <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground group-hover:text-foreground/80">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

 
