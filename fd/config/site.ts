/** Team identity + public navigation — everything user-facing is Mongolian. */
export const siteConfig = {
  name: "СЭЗИС Сагсан бөмбөг",
  shortName: "СЭЗИС",
  fullName: "СЭЗИС-ийн сагсан бөмбөгийн шигшээ баг",
  title: "СЭЗИС Сагсан бөмбөгийн шигшээ баг",
  description:
    "1992 оноос эхтэй түүхтэй СЭЗИС-ийн Сагсан бөмбөгийн шигшээ баг. Бид зөвхөн тоглолтын оноо биш, багаар ажиллах соёл, тууштай хөдөлмөрлөх зан чанар, өөрийгөө болон хамтдаа хөгжих тэмүүллийг төлөвшүүлдэг.",
  headerSubtitle: "Сагсан бөмбөг",
  university: "Санхүү, эдийн засгийн их сургууль",
  latinName: "UFE BASKETBALL",
  foundedYear: 1992,
  /**
   * Group photo on the homepage hero's right rail (background stripped →
   * transparent WebP). Shown on every carousel slide — only the text panels
   * rotate. Empty string hides the rail visual.
   */
  heroGroupImage: "/images/hero/champions-clean.webp",
} as const;

/**
 * Alternate "pointing" cutout swapped in on hover for the directory cards,
 * keyed by executive slug. Members without an entry keep the plain
 * grayscale→color hover.
 */
export const executiveHoverPhotos: Record<string, string> = {
  "b-purevdorj": "/images/executive/pointpurev.png",
  "d-ambokh": "/images/executive/pointcoach.png",
  "ts-ganbat": "/images/executive/pointass.png",
  "g-anu": "/images/executive/pointdoc.png",
};

export const publicNav = [
  { href: "/", label: "Нүүр" },
  { href: "/history", label: "Түүх" },
  { href: "/players", label: "Тоглогчид" },
  { href: "/front-office", label: "Удирдлага" },
  { href: "/schedule", label: "Хуваарь" },
  { href: "/news", label: "Мэдээ" },
  { href: "/media", label: "Медиа" },
  { href: "/fan-club", label: "Мерч" },
  { href: "/sponsors", label: "Дэмжигчид" },
] as const;
