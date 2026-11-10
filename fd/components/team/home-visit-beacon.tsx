"use client";

import { useEffect, useRef } from "react";

import { analyticsService } from "@/services/analytics.service";

/**
 * Counts one homepage view per render/refresh of "/" (audience reach on the
 * admin dashboard). Runs client-side because the page itself is ISR-cached —
 * a server-side counter would only see cache misses. The ref keeps React's
 * dev strict-mode effect replay from counting twice; failures are silent so
 * the beacon can never break the page.
 */
export function HomeVisitBeacon() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    analyticsService.recordHomeVisit().catch(() => {});
  }, []);

  return null;
}
