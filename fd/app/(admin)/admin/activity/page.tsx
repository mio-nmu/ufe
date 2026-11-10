import type { Metadata } from "next";

import { ActivityHistory } from "@/components/admin/activity-history";

export const metadata: Metadata = {
  title: "Admin · Activity",
};

export default function AdminActivityPage() {
  return <ActivityHistory />;
}
