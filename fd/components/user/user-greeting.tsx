"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/auth-provider";

/** Personalised greeting card fed by the authenticated user + profile query. */
export function UserAreaGreeting() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Signed in as</p>
          <p className="text-lg font-medium">{user.name ?? user.email}</p>
          <p className="text-muted-foreground text-xs">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
            {user.role}
          </Badge>
          <Badge variant={user.isActive ? "outline" : "secondary"}>
            {user.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
