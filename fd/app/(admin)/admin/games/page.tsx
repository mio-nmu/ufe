import type { Metadata } from "next";

import { GamesManager } from "@/components/admin/managers";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Admin · Тоглолтууд",
};

export default function AdminGamesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Тоглолтууд"
        description="Хуваарь, үр дүн, өрсөлдөгчийн лого ба өнгө."
      />
      <GamesManager />
    </div>
  );
}
