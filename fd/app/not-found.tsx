import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export default function NotFound() {
  return (
    <div className="bg-paper-soft flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="text-brand-2 font-display text-2xl font-semibold tracking-[0.12em]">
        404
      </p>
      <div className="space-y-2">
        <h1 className="font-display text-ink text-3xl font-semibold tracking-[0.02em] uppercase">
          Хуудас олдсонгүй
        </h1>
        <p className="text-mute text-sm leading-[1.65]">
          Таны хайж буй хуудас байхгүй эсвэл шилжсэн байна.
        </p>
      </div>
      <Button asChild className="font-display tracking-[0.06em] uppercase">
        <Link href={routes.home}>Нүүр хуудас руу буцах</Link>
      </Button>
    </div>
  );
}
