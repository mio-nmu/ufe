"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  ACCENT,
  DASHBOARD_ANIMATION_MS,
  DashboardCardHeader,
  LiveBadge,
} from "@/components/admin/dashboard/card-chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminVisits } from "@/hooks/use-admin";
import { ApiClientError } from "@/lib/api-client";
import { cn } from "cn";
import type { VisitRange, VisitSeries } from "@/types/api";

const RANGES: { value: VisitRange; label: string }[] = [
  { value: "month", label: "1 month" },
  { value: "quarter", label: "3 months" },
  { value: "year", label: "1 year" },
];

/**
 * Admin dashboard "Website visitors": homepage renders/refreshes for the
 * chosen range (weekly points for 1/3 months, monthly for 1 year), the
 * range total with its change vs the period before, and a polled ("Live")
 * line chart. Hover a point for its exact count.
 */
export function VisitorsCard() {
  const [range, setRange] = useState<VisitRange>("month");
  const { data, isPending, isError, error, refetch, isPlaceholderData } =
    useAdminVisits(range);

  return (
    <Card className="gap-0 py-0">
      <DashboardCardHeader
        title="Website visitors"
        description="Homepage visits"
        action={<LiveBadge />}
      />

      <CardContent className="space-y-6 px-6 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-h-14 items-center gap-3">
            {data ? (
              <>
                <AnimatedNumber
                  value={data.total}
                  className="text-primary text-5xl leading-none font-bold tabular-nums"
                />
                <ChangeBadge
                  total={data.total}
                  previousTotal={data.previousTotal}
                />
              </>
            ) : isPending ? (
              <Skeleton className="h-12 w-40 rounded-lg" />
            ) : null}
          </div>
          <RangeToggle value={range} onChange={setRange} />
        </div>

        {data ? (
          <VisitsChart series={data} dimmed={isPlaceholderData} />
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
            aria-label="Loading visitors"
          />
        )}
      </CardContent>
    </Card>
  );
}

/** Counts up from 0 on first render and eases between range totals. */
function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  // Where the number currently sits, so an interrupted count resumes from it.
  const current = useRef(0);

  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: reduceMotion ? 0 : DASHBOARD_ANIMATION_MS / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        current.current = latest;
        setShown(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return (
    <p className={className} aria-live="polite">
      {shown.toLocaleString()}
    </p>
  );
}

function ChangeBadge({
  total,
  previousTotal,
}: {
  total: number;
  previousTotal: number;
}) {
  // No baseline yet (first period with data) — a % change would be meaningless.
  if (previousTotal === 0) return null;
  const change = Math.round(((total - previousTotal) / previousTotal) * 100);
  return (
    <span
      className={cn(
        ACCENT,
        "rounded-full px-3 py-1 text-sm font-semibold tabular-nums",
      )}
    >
      {change > 0 ? "+" : ""}
      {change}% vs prev
    </span>
  );
}

function RangeToggle({
  value,
  onChange,
}: {
  value: VisitRange;
  onChange: (range: VisitRange) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div role="group" aria-label="Time range" className="flex gap-2">
      {RANGES.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-visible:ring-ring relative isolate min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              active
                ? "border-transparent text-white"
                : "border-primary text-primary hover:bg-primary/5",
            )}
          >
            {active ? (
              // One pill that slides between buttons instead of blinking.
              <motion.span
                layoutId="visits-range-pill"
                aria-hidden="true"
                className={cn(ACCENT, "absolute inset-0 -z-10 rounded-full")}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 36 }
                }
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function VisitsChart({
  series,
  dimmed,
}: {
  series: VisitSeries;
  dimmed: boolean;
}) {
  const chartData = series.buckets.map((bucket) => ({
    count: bucket.count,
    label: formatBucket(bucket.start, series.bucket, "axis"),
    tooltip: formatBucket(bucket.start, series.bucket, "tooltip"),
  }));
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "h-72 w-full transition-opacity duration-300",
        dimmed && "opacity-60",
      )}
      role="img"
      aria-label={`Homepage visits per ${series.bucket}, ${RANGES.find((r) => r.value === series.range)?.label}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 16, bottom: 0, left: -8 }}
        >
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={13}
            tickMargin={10}
            interval="preserveStartEnd"
            minTickGap={24}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            fontSize={13}
            tickCount={5}
            domain={[0, "auto"]}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            contentStyle={{
              backgroundColor: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              color: "var(--color-popover-foreground)",
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.tooltip}
            formatter={(value) => [Number(value).toLocaleString(), "Visits"]}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            dot={{
              r: 5,
              fill: "var(--color-card)",
              stroke: "var(--color-primary)",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "var(--color-primary)",
              stroke: "var(--color-card)",
              strokeWidth: 2,
            }}
            isAnimationActive={!reduceMotion}
            animationDuration={DASHBOARD_ANIMATION_MS}
            animationEasing="ease-in-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Bucket starts are UTC days — format in UTC so they never shift a day. */
function formatBucket(
  start: string,
  bucket: VisitSeries["bucket"],
  style: "axis" | "tooltip",
): string {
  const date = new Date(`${start}T00:00:00Z`);
  if (bucket === "month") {
    return date.toLocaleDateString(undefined, {
      month: style === "axis" ? "short" : "long",
      year: style === "axis" ? undefined : "numeric",
      timeZone: "UTC",
    });
  }
  const day = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return style === "axis" ? day : `Week of ${day}`;
}
