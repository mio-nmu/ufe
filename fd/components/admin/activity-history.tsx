"use client";

import { useState } from "react";

import { ActivityTimeline } from "@/components/admin/dashboard/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminActivity } from "@/hooks/use-admin";
import { ApiClientError } from "@/lib/api-client";

const PAGE_SIZE = 20;

/** Full admin activity log ("View all" from the dashboard), paged. */
export function ActivityHistory() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useAdminActivity(page, PAGE_SIZE);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Өөрчлөлтийн түүх"
        description="Every admin-side change, newest first."
      />
      <Card>
        <CardContent className="px-6 py-6 sm:px-8">
          {data ? (
            data.items.length ? (
              <div
                className={
                  isPlaceholderData ? "opacity-60 transition-opacity" : ""
                }
              >
                <ActivityTimeline entries={data.items} showActor />
              </div>
            ) : (
              <p className="text-muted-foreground py-10 text-center">
                No admin changes yet.
              </p>
            )
          ) : isPending ? (
            <Skeleton
              className="h-96 w-full rounded-lg"
              aria-busy="true"
              aria-label="Loading activity"
            />
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

      {data && data.meta.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            {data.meta.page} / {data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.meta.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              Өмнөх
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Дараах
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
