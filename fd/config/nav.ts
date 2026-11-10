import {
  BarChart3,
  CalendarDays,
  FileText,
  History,
  Images,
  Info,
  LayoutDashboard,
  Newspaper,
  ShoppingBag,
  Timeline,
  Users,
  Video,
  Timer,
} from "lucide-react";

import { ADMIN_TEXT_PAGES } from "@/config/admin-text-pages";
import { routes } from "@/config/routes";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const userNav: NavItem[] = [
  { href: routes.user.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { href: routes.user.profile, label: "Profile", icon: FileText },
  { href: routes.user.settings, label: "Settings", icon: BarChart3 },
];

/** Admin sidebar — English paths, Mongolian labels, grouped in sections. */
const adminNavSections: NavSection[] = [
  {
    items: [
      { href: routes.admin.dashboard, label: "Хяналт", icon: BarChart3 },
      { href: routes.admin.scorer, label: "Live scorer", icon: Timer },
      { href: routes.admin.games, label: "Тоглолтууд", icon: CalendarDays },
    ],
  },
  {
    title: "Агуулга",
    items: [
      { href: routes.admin.players, label: "Тоглогчид", icon: Users },
      { href: routes.admin.staff, label: "Багийн ажилчид", icon: Users },
      { href: routes.admin.management, label: "Удирдлага", icon: FileText },
      { href: routes.admin.gallery, label: "Галерей", icon: Images },
      { href: routes.admin.videos, label: "Бичлэгүүд", icon: Video },
      { href: routes.admin.shop, label: "Дэлгүүр", icon: ShoppingBag },
      { href: routes.admin.news, label: "Мэдээ", icon: Newspaper },
    ],
  },
  {
    title: "Хуудасны текст",
    items: ADMIN_TEXT_PAGES.map((page) => ({
      href: `/admin/text/${page.slug}`,
      label: page.label,
      icon: Timeline,
    })),
  },
  {
    title: "Систем",
    items: [
      { href: routes.admin.general, label: "Ерөнхий мэдээлэл", icon: Info },
      { href: routes.admin.users, label: "Хэрэглэгчид", icon: Users },
      {
        href: routes.admin.activity,
        label: "Өөрчлөлтийн түүх",
        icon: History,
      },
    ],
  },
];

/** Flat list kept for consumers that don't render sections. */
export const adminNav: NavItem[] = adminNavSections.flatMap(
  (section) => section.items,
);

/** Grouped shape consumed by AdminShell — every group gets a visible label. */
export const adminNavGroups = adminNavSections.map((section, index) => ({
  label: section.title ?? (index === 0 ? "Үндсэн" : ""),
  items: section.items,
}));
