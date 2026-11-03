"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck, UserCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/config/site";
import { adminNav, adminNavGroups } from "@/config/nav";
import { routes } from "@/config/routes";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

/**
 * Sidebar shell for the admin area. Deliberately separate from the user
 * shell: different nav, different guard, no shared layout component.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-svh">
      <aside className="bg-muted/40 hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <ShieldCheck className="size-5" aria-hidden="true" />
          <Link
            href={routes.admin.dashboard}
            className="font-semibold tracking-tight"
          >
            {siteConfig.name}
          </Link>
          <Badge variant="secondary" className="ml-auto">
            Admin
          </Badge>
        </div>
        <nav
          aria-label="Admin"
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-3"
        >
          {adminNavGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={cn(
                "space-y-1",
                groupIndex > 0 && "border-border/60 mt-1 border-t pt-4",
              )}
            >
              <p className="text-muted-foreground px-3 pb-0.5 text-[12px] font-semibold tracking-[0.12em] uppercase">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "bg-background text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/60 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                    }
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="text-muted-foreground w-full justify-start"
            onClick={() => {
              void logout();
            }}
          >
            <LogOut aria-hidden="true" /> Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border/40 flex h-16 items-center justify-between gap-3 border-b px-4 md:px-6">
          <nav
            aria-label="Admin mobile"
            className="flex items-center gap-1 overflow-x-auto md:hidden"
          >
            {adminNav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "bg-muted text-foreground shrink-0 rounded-md px-3 py-1.5 text-sm font-medium"
                      : "text-muted-foreground shrink-0 rounded-md px-3 py-1.5 text-sm"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <UserCircle className="size-5" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="truncate">{user?.name ?? "Admin"}</span>
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {user?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => {
                    void logout();
                  }}
                >
                  <LogOut aria-hidden="true" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
