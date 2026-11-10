import type { Metadata } from "next";

import { GameTimelineCard } from "@/components/admin/dashboard/game-timeline-card";
import { RecentActivityCard } from "@/components/admin/dashboard/recent-activity-card";
import { VisitorsCard } from "@/components/admin/dashboard/visitors-card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin dashboard"
        description="Audience reach, games played and the latest admin changes."
      />
      <VisitorsCard />
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <GameTimelineCard />
        <RecentActivityCard />
      </div>
    </div>
  );
}
