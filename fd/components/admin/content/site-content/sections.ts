import { siteContentDefault } from "@/lib/site-content-defaults";

/**
 * Registry for the structured page-copy editor ("Хуудасны текст"): every
 * editable bd/ site-content page/section pair, its field tree (labels,
 * limits, array floors/caps in Mongolian) and the normalization rules that
 * keep the editor never-empty — a stored blob always renders pre-filled
 * with either its stored value or the static default the public page would
 * show. Keys present in the blob but not modelled here are passed through
 * untouched on save so the editor can never silently drop data.
 */

// ── Field definitions ────────────────────────────────────────────────────────

interface BaseFieldDef {
  key: string;
  label: string;
  help?: string;
  placeholder?: string;
}

export interface StringFieldDef extends BaseFieldDef {
  kind: "text" | "textarea" | "url" | "color";
  /** maxLength + visible counter (textarea). */
  max?: number;
  rows?: number;
}

export interface ListFieldDef extends BaseFieldDef {
  kind: "list";
  itemLabel?: string;
  /** Deleting below min is refused; the trash button disables. */
  min?: number;
  /** Adding above max is refused; the add button disables. */
  max?: number;
  /** Allow an empty array (no default snap-back) — for optional bullets. */
  allowEmpty?: boolean;
  newItem?: () => string;
}

export interface CardsFieldDef extends BaseFieldDef {
  kind: "cards";
  /** Object key shown in the collapsed accordion header. */
  titleKey: string;
  itemLabel?: string;
  min?: number;
  max?: number;
  fields: CopyFieldDef[];
  newItem: () => Record<string, unknown>;
}

export interface GroupFieldDef extends BaseFieldDef {
  kind: "group";
  fields: CopyFieldDef[];
}

export type CopyFieldDef =
  StringFieldDef | ListFieldDef | CardsFieldDef | GroupFieldDef;

// ── Section / page definitions ───────────────────────────────────────────────

export interface SiteSectionDef {
  page: string;
  section: string;
  title: string;
  description: string;
  fields: CopyFieldDef[];
  /** Fixed chrome for the generic PageHero preview (hero-intro sections). */
  preview?: { breadcrumb: string; title: string };
  /**
   * Pointer link to the CMS tab that manages this section's live rows
   * (news cards, shop products…) — no duplicated editing here.
   */
  related?: { label: string; tab: string };
}

export interface SitePageDef {
  key: string;
  label: string;
  sections: SiteSectionDef[];
}

export const sectionId = (def: SiteSectionDef) => `${def.page}/${def.section}`;

/** All (page, section) pairs the public pages read via getPageCopy. */
export const CONSUMED_SECTION_PAIRS: Array<[string, string]> = [
  ["home", "hero"],
  ["home", "news"],
  ["home", "stats"],
  ["home", "thanks"],
  ["home", "timeline"],
  ["history", "page"],
  ["players", "page"],
  ["fan-club", "page"],
  ["contact", "info"],
  ["schedule", "hero"],
  ["media", "hero"],
  ["front-office", "hero"],
];

const text = (
  key: string,
  label: string,
  extra: Partial<StringFieldDef> = {},
): StringFieldDef => ({ kind: "text", key, label, ...extra });

const area = (
  key: string,
  label: string,
  extra: Partial<StringFieldDef> = {},
): StringFieldDef => ({ kind: "textarea", key, label, rows: 3, ...extra });

export const SITE_CONTENT_PAGES: SitePageDef[] = [
  {
    key: "home",
    label: "Нүүр хуудас",
    sections: [
      {
        page: "home",
        section: "hero",
        title: "Нүүр хуудас — эхний дэлгэц",
        description:
          "Геройн carousel-ийн гурван слайдын бичвэр. AUBL блок нь Түүх хуудаснд мөн харагдана.",
        fields: [
          text("badge", "Тэмдэглэгээ (badge)", {
            help: "Геройн дээд буланд гарах жижиг шошго.",
          }),
          text("title", "Багийн нэр"),
          text("headline", "Толгой гарчиг", {
            help: "Геройн том, конденс үсгээр гарчиг.",
          }),
          area("intro", "Танилцуулга", { max: 600, rows: 4 }),
          text("ctaPlayers", "Товч — Тоглогчид"),
          text("ctaHistory", "Товч — Түүх"),
          {
            kind: "group",
            key: "aubl",
            label: "AUBL блок",
            help: "Нүүр хуудасны «Дараагийн тэмцээн» тууз ба Түүх хуудасны хэсэг.",
            fields: [
              text("title", "Гарчиг"),
              area("text", "Тайлбар", { max: 400 }),
            ],
          },
        ],
      },
      {
        page: "home",
        section: "news",
        title: "Онцлох мэдээ — хэсгийн гарчиг",
        description:
          "Мэдээний хэсгийн шошго ба гарчиг. Картууд өөрөө «Мэдээ» таб дотор удирдагдана.",
        related: { label: "Мэдээ удирдах", tab: "news" },
        fields: [
          text("label", "Шошго", {
            help: "Картын дээд шошго (ж.нь. Онцлох мэдээ).",
          }),
          text("heading", "Хэсгийн гарчиг"),
          area("lead", "Тайлбар", {
            max: 300,
            help: "Нөөц талбар — одоогоор нийтийн хуудсанд харагддаггүй.",
          }),
        ],
      },
      {
        page: "home",
        section: "stats",
        title: "Тоонуудын хэсэг",
        description:
          "Нүүр хуудасны тоонуудын тууз. Нийтийн хуудас 4 баганаар харуулна.",
        fields: [
          {
            kind: "cards",
            key: "items",
            label: "Тоонууд",
            titleKey: "label",
            itemLabel: "Тоо",
            min: 1,
            max: 4,
            newItem: () => ({ label: "Шинэ тоо", value: "0" }),
            fields: [
              text("value", "Утга", { placeholder: "6,000+" }),
              text("label", "Тайлбар", { placeholder: "Оюутан" }),
            ],
          },
        ],
      },
      {
        page: "home",
        section: "timeline",
        title: "Түүхэн мөчүүд",
        description:
          "Нүүр хуудасны түүхийн тууз: гарчиг, товч ба 6 хүртэлх үе. Медаль: gold, silver, bronze эсвэл хоосон.",
        fields: [
          text("eyebrow", "Дээд шошго", {
            placeholder: "1992 — Өнөөдрийг хүртэл",
          }),
          text("title", "Гарчиг"),
          text("cta", "Товчны бичвэр"),
          {
            kind: "cards",
            key: "items",
            label: "Үеүд",
            titleKey: "period",
            itemLabel: "Үе",
            min: 1,
            max: 6,
            newItem: () => ({ description: "", medal: "", period: "Шинэ он" }),
            fields: [
              text("period", "Үе / он", { placeholder: "2025–2026" }),
              area("description", "Тайлбар", { max: 160, rows: 2 }),
              text("medal", "Медаль", {
                help: "gold, silver, bronze (эсвэл алт, мөнгө, хүрэл). Хоосон бол медальгүй.",
                placeholder: "gold",
              }),
            ],
          },
        ],
      },
      {
        page: "home",
        section: "thanks",
        title: "Талархлын хэсэг",
        description:
          "Нүүр хуудасны төгсгөлд гарах талархлын бичвэр ба ивээн тэтгэгчид.",
        fields: [
          text("heading", "Гарчиг"),
          area("paragraphOne", "Дагалдах бичвэр 1", { max: 900, rows: 5 }),
          area("paragraphTwo", "Дагалдах бичвэр 2", { max: 900, rows: 5 }),
          {
            kind: "list",
            key: "sponsors",
            label: "Ивээн тэтгэгчид",
            itemLabel: "Нэр",
            min: 1,
            max: 12,
            newItem: () => "",
          },
        ],
      },
    ],
  },
  {
    key: "history",
    label: "Түүх",
    sections: [
      {
        page: "history",
        section: "page",
        title: "Түүхийн хуудас",
        description:
          "Түүхийн гарчиг, танилцуулга ба хажуугийн цагийн шугаман үеүд.",
        fields: [
          text("title", "Хуудасны гарчиг"),
          area("intro", "Танилцуулга", { max: 500 }),
          {
            kind: "cards",
            key: "timeline",
            label: "Цагийн шугам",
            titleKey: "period",
            itemLabel: "Үе",
            min: 1,
            max: 30,
            newItem: () => ({ period: "Шинэ он", text: "" }),
            fields: [
              text("period", "Үе / он", { placeholder: "1992" }),
              text("highlightLabel", "Онцлох тэмдэглэгээ", {
                help: "Хоосон бол харагдахгүй (ж.нь. «онцлох жил»).",
              }),
              area("text", "Тайлбар", { max: 700 }),
              {
                kind: "list",
                key: "bullets",
                label: "Мөрүүд",
                itemLabel: "Мөр",
                max: 20,
                allowEmpty: true,
                newItem: () => "",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    key: "players",
    label: "Тоглогчид",
    sections: [
      {
        page: "players",
        section: "page",
        title: "Тоглогчидын хуудас",
        description:
          "Хуудасны гарчиг ба дэд гарчиг. Багийн бүрэлдэхүүн «Тоглогчид» таб дотор удирдагдана.",
        related: { label: "Тоглогчид удирдах", tab: "players" },
        fields: [text("title", "Гарчиг"), text("subtitle", "Дэд гарчиг")],
      },
    ],
  },
  {
    key: "fan-club",
    label: "Мерч",
    sections: [
      {
        page: "fan-club",
        section: "page",
        title: "Мерчийн хуудас",
        description:
          "Мерч хуудасны толгой хэсэг ба ээлжлэн гардаг урамшууллын тууз. Бүтээгдэхүүн «Дэлгүүр» таб дотор удирдагдана.",
        related: { label: "Дэлгүүр удирдах", tab: "shop" },
        fields: [
          text("title", "Гарчиг"),
          text("subtitle", "Дэд гарчиг"),
          text("cta", "Товчны бичиг"),
          {
            kind: "url",
            key: "heroImage",
            label: "Толгой зургийн URL",
            help: "Хоосон бол заагдмал загвар харагдана.",
          } as StringFieldDef,
          {
            kind: "list",
            key: "promos",
            label: "Урамшууллын мөрүүд",
            itemLabel: "Мөр",
            min: 1,
            max: 6,
            help: "Дээд туузанд 5 секунд тутам ээлжлэн гардаг.",
            newItem: () => "",
          },
        ],
      },
    ],
  },
  {
    key: "contact",
    label: "Холбоо барих",
    sections: [
      {
        page: "contact",
        section: "info",
        title: "Хөлийн хэсгийн холбооны мэдээлэл",
        description:
          "Бүх хуудасны хөлийн хэсэгт харагдах хаяг, утас, имэйл болон вэбийн мэдээлэл.",
        fields: [
          text("address", "Хаяг"),
          text("email", "Имэйл"),
          {
            kind: "list",
            key: "phones",
            label: "Утаснууд",
            itemLabel: "Утас",
            min: 1,
            max: 10,
            newItem: () => "",
          },
          {
            kind: "list",
            key: "footerPhones",
            label: "Хөлийн хэсгийн утаснууд",
            itemLabel: "Утас",
            min: 1,
            max: 4,
            help: "Хөлийн хэсэгт харагдах богино жагсаалт.",
            newItem: () => "",
          },
          text("web", "Сайтын нэр"),
          {
            kind: "url",
            key: "webUrl",
            label: "Сайтын холбоос",
          } as StringFieldDef,
          text("slogan", "Уриа"),
        ],
      },
    ],
  },
  {
    key: "heroes",
    label: "Толгой тайлбар",
    sections: [
      heroSection(
        "schedule",
        "Хуваарь — толгой тайлбар",
        "Хуваарын хуудасны нүүр бичвэр. Тоглолтууд «Хуваарь» таб дотор.",
        { breadcrumb: "Хуваарь", title: "Хуваарь" },
        { label: "Хуваарь удирдах", tab: "games" },
      ),
      {
        page: "media",
        section: "hero",
        title: "Медиа — толгой тайлбар",
        description:
          "Нэгдсэн Медиа хуудасны нүүр бичвэр. Зургийн цомогууд «Галерей» таб дотор, бичлэгүүд «Бичлэгүүд» таб дотор удирдагдана.",
        preview: { breadcrumb: "Медиа", title: "Медиа" },
        fields: [
          area("intro", "Тайлбар", { max: 400 }),
          {
            kind: "url",
            key: "poster",
            label: "Постерийн URL",
            help: "Онцлох видеоны дүрс гарч иртэл харагдана. Хоосон бол заагдмал зураг.",
          } as StringFieldDef,
        ],
      },
      heroSection(
        "front-office",
        "Удирдлага — толгой тайлбар",
        "Удирдлагын хуудасны нүүр бичвэр. Хүмүүс «Удирдлага» таб дотор.",
        { breadcrumb: "Удирдлага", title: "Удирдлага" },
        { label: "Удирдлага удирдах", tab: "executives" },
      ),
    ],
  },
];

function heroSection(
  page: string,
  title: string,
  description: string,
  preview: { breadcrumb: string; title: string },
  related: { label: string; tab: string },
): SiteSectionDef {
  return {
    page,
    section: "hero",
    title,
    description,
    preview,
    related,
    fields: [area("intro", "Тайлбар", { max: 400 })],
  };
}

/**
 * Stored section blob → editor state: every modelled field resolves to its
 * stored value, else the static public-site default, so the form never
 * renders blank. Unknown keys ride along untouched.
 */
export function normalizeSectionData(
  def: SiteSectionDef,
  raw: unknown,
): Record<string, unknown> {
  const fallback = siteContentDefault(def.page, def.section) ?? {};
  const source = isPlainObject(raw) && Object.keys(raw).length > 0 ? raw : {};
  const out = normalizeFields(def.fields, source, fallback);
  const known = new Set(def.fields.map((field) => field.key));
  for (const [key, value] of Object.entries(source)) {
    if (!known.has(key)) out[key] = value;
  }
  return out;
}

function normalizeFields(
  fields: CopyFieldDef[],
  raw: Record<string, unknown>,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.kind) {
      case "group": {
        const nested = raw[field.key];
        const nestedFallback = fallback[field.key];
        out[field.key] = normalizeFields(
          field.fields,
          isPlainObject(nested) ? nested : {},
          isPlainObject(nestedFallback) ? nestedFallback : {},
        );
        break;
      }
      case "list": {
        let items = toStringArray(raw[field.key]);
        if (!items.length && !field.allowEmpty) {
          items = toStringArray(fallback[field.key]);
        }
        out[field.key] = items.slice(0, field.max ?? items.length);
        break;
      }
      case "cards": {
        let items = toObjectArray(raw[field.key]).map((item) =>
          normalizeFields(field.fields, item, item),
        );
        if (!items.length) {
          items = toObjectArray(fallback[field.key]).map((item) =>
            normalizeFields(field.fields, item, item),
          );
        }
        out[field.key] = items.slice(0, field.max ?? items.length);
        break;
      }
      default:
        out[field.key] =
          nonEmptyString(raw[field.key]) ??
          nonEmptyString(fallback[field.key]) ??
          "";
        break;
    }
  }
  return out;
}

// ── Normalization (stored blob → never-empty editing state) ─────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPlainObject);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
