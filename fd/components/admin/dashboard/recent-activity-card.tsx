"use client";

import Link from "next/link";

import { ActivityTimeline } from "@/components/admin/dashboard/activity-timeline";
import { DashboardCardHeader } from "@/components/admin/dashboard/card-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { useAdminActivity } from "@/hooks/use-admin";
import { ApiClientError } from "@/lib/api-client";

/** Entries the dashboard feed shows; the rest live behind "View all". */
const RECENT_LIMIT = 5;

/** Admin dashboard "Recent activity": the latest admin-side changes. */
export function RecentActivityCard() {
  const { data, isPending, isError, error, refetch } = useAdminActivity(
    1,
    RECENT_LIMIT,
  );

  return (
    <Card className="gap-0 py-0">
      <DashboardCardHeader
        title="Recent activity"
        description="Content updates across the admin side"
        divided={false}
        action={
          <Link
            href={routes.admin.activity}
            className="text-primary focus-visible:ring-ring rounded-sm text-base font-medium whitespace-nowrap hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            View all
          </Link>
        }
      />
      <CardContent className="px-6 pt-6 pb-8 sm:px-8">
        {data ? (
          data.items.length ? (
            <ActivityTimeline entries={data.items} />
          ) : (
            <p className="text-muted-foreground py-10 text-center">
              No admin changes yet.
            </p>
          )
        ) : isPending ? (
          <div
            className="space-y-6"
            aria-busy="true"
            aria-label="Loading activity"
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p role="alert" className="text-muted-foreground">
              {error instanceof ApiClientError
                ? error.message
                : "The API did not answer."}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
