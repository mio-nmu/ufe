"use client";

import { UserRound, UserRoundCheck, UserRoundCog } from "lucide-react";

import { RegistrationsChart } from "@/components/admin/registrations-chart";
import { FadeIn } from "@/components/motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAdminStats } from "@/hooks/use-admin";
import { ApiClientError } from "@/lib/api-client";
import type { AdminStats } from "@/types/api";

/** Client panel: owns the useAdminStats query + stat cards and chart. */
export function AdminStatsPanel() {
  const { data, isPending, isError, error, refetch } = useAdminStats();

  const stats: AdminStats | undefined = data;

  return (
    <>
      {isPending ? (
        <StatsSkeleton />
      ) : isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Could not load statistics</CardTitle>
            <CardDescription role="alert">
              {error instanceof ApiClientError
                ? error.message
                : "The API did not answer."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : stats ? (
        <>
          <FadeIn className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total users"
              value={stats.users.total}
              icon={UserRound}
            />
            <StatCard
              label="Active"
              value={stats.users.active}
              icon={UserRoundCheck}
            />
            <StatCard
              label="Admins"
              value={stats.users.admins}
              icon={UserRoundCog}
            />
          </FadeIn>

          <FadeIn delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle>Registrations</CardTitle>
                <CardDescription>
                  New accounts per day (seeded data counts too).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegistrationsChart data={stats.registrations} />
              </CardContent>
            </Card>
          </FadeIn>
        </>
      ) : null}
    </>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof UserRound;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="text-muted-foreground size-4" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-3"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-29 w-full rounded-xl" />
      ))}
    </div>
  );
}
