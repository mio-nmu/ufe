"use client";

import { useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  DASHBOARD_ANIMATION_MS,
  DashboardCardHeader,
  LiveBadge,
} from "@/components/admin/dashboard/card-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGameTimeline } from "@/hooks/use-admin";
import { ApiClientError } from "@/lib/api-client";
import type { GameTimeline } from "@/types/api";

// Soft bar at rest, the darker accent under the pointer (ACCENT tints).
const BAR_FILL = "#cfdbe9";
const BAR_ACTIVE_FILL = "#6b8cc4";

/** The y-axis shows only 0 and a round top, never less than 10. */
const MIN_Y_TOP = 10;

/**
 * Admin dashboard "Game timeline": games played per month over the last six
 * months (every game not cancelled whose tip-off has passed — friendly
 * matches included once they are stored as games). Polled ("Live").
 */
export function GameTimelineCard() {
  const { data, isError, error, refetch } = useAdminGameTimeline();

  return (
    <Card className="gap-0 py-0">
      <DashboardCardHeader
        title="Game timeline"
        description="Games played over the last 6 months"
        action={<LiveBadge />}
      />
      <CardContent className="px-6 py-6 sm:px-8">
        {data ? (
          <GamesChart timeline={data} />
        ) : isError ? (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
            <p role="alert" className="text-muted-foreground">
              {error instanceof ApiClientError
                ? error.message
                : "The API did not answer."}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <Skeleton
            className="h-72 w-full rounded-lg"
            aria-busy="true"
            aria-label="Loading game timeline"
          />
        )}
      </CardContent>
    </Card>
  );
}

function GamesChart({ timeline }: { timeline: GameTimeline }) {
  const chartData = timeline.months.map((month) => ({
    count: month.count,
    label: formatMonth(month.start, "short"),
    tooltip: formatMonth(month.start, "long"),
  }));
  const yTop = roundedTop(Math.max(...chartData.map((month) => month.count)));
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label="Games played per month over the last 6 months"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, bottom: 0, left: -16 }}
        >
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={13}
            tickMargin={10}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={13}
            domain={[0, yTop]}
            ticks={[0, yTop]}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            cursor={false}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              color: "var(--color-popover-foreground)",
              fontSize: 12,
            }}
            // Recharts colours the value with the bar fill, too pale to read.
            itemStyle={{ color: "var(--color-popover-foreground)" }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltip}
            formatter={(value) => [Number(value), "Games"]}
          />
          <Bar
            dataKey="count"
            fill={BAR_FILL}
            activeBar={{ fill: BAR_ACTIVE_FILL }}
            radius={[10, 10, 0, 0]}
            maxBarSize={56}
            isAnimationActive={!reduceMotion}
            animationDuration={DASHBOARD_ANIMATION_MS}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Month starts are UTC days — format in UTC so they never shift a month. */
function formatMonth(start: string, style: "short" | "long"): string {
  return new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, {
    month: style,
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/** Smallest multiple of 10 that fits the busiest month (at least 10). */
function roundedTop(max: number): number {
  return Math.max(MIN_Y_TOP, Math.ceil(max / 10) * 10);
}
