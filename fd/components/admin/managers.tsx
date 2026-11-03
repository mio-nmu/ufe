"use client";

import { CalendarDays, Shirt, Video as VideoIcon } from "lucide-react";

import {
  CollectionManager,
  MediaPill,
  type CollectionConfig,
} from "@/components/admin/collection-manager";

type Row = Record<string, unknown> & { id: string };

// Defined before the configs below: playerCard calls asTextFn at load.
const asText = (row: Row, key: string) => String(row[key] ?? "").trim();

const visible = (row: Row, key: string) =>
  row[key]
    ? { label: "Нийтэд", tone: "green" as const }
    : { label: "Нууц", tone: "neutral" as const };

const asTextFn = (key: string) => (row: Row) => asText(row, key) || "(нэргүй)";

// ─── Тоглогчид / Багийн ажилчид (Player collection, role-split) ─────────────

const PLAYER_FIELDS: CollectionConfig["fields"] = [
  {
    name: "name",
    label: "Нэр",
    type: "text",
    required: true,
    placeholder: "Номчбаатар Наранбаатар",
  },
  {
    name: "slug",
    slugFrom: "name",
    label: "Slug (URL нэр)",
    type: "text",
    required: true,
    placeholder: "nomchbaatar-naranbaatar",
  },
  { name: "number", label: "Дугаар", type: "number" },
  {
    name: "position",
    label: "Байрлал / албан тушаал",
    type: "text",
    placeholder: "Холбон тоглогч",
  },
  { name: "heightCm", label: "Өндөр (см)", type: "number" },
  { name: "weightKg", label: "Жин (кг)", type: "number" },
  { name: "birthYear", label: "Төрсөн он", type: "number" },
  { name: "hometown", label: "Төрсөн газар", type: "text" },
  { name: "academicYear", label: "Курс", type: "text" },
  { name: "photo", label: "Зураг (Cloudinary)", type: "image" },
  {
    name: "photoPosition",
    label: "Зургийн байрлал (дээш/доош)",
    type: "range",
    min: 0,
    max: 100,
    step: 5,
    defaultValue: 100,
    emptyDisplayValue: 100,
    previewImageField: "photo",
    hint: "Зургийн харагдах байдлыг дээш (0%) эсвэл доош (100%) чиглэлд гялсуулна — 100% нь үндсэн байрлал.",
  },
  {
    name: "photoScale",
    label: "Зургийн хэмжээ (жижиг/том)",
    type: "range",
    min: 40,
    max: 150,
    step: 5,
    defaultValue: 100,
    emptyDisplayValue: 100,
    previewImageField: "photo",
    previewMode: "scale",
    previewImagePositionField: "photoPosition",
    hint: "Зургийг жижигсгэх (<100%) эсвэл томруулах (>100%) — 100% нь жинхэнэ хэмжээ.",
  },
  { name: "actionPhoto", label: "Нэмэлт зураг", type: "image" },
  { name: "bio", label: "Товч танилцуулга", type: "textarea" },
  { name: "ppg", label: "PPG", type: "number", step: 0.1 },
  { name: "rpg", label: "RPG", type: "number", step: 0.1 },
  { name: "apg", label: "APG", type: "number", step: 0.1 },
  { name: "isCaptain", label: "Ахлагч", type: "checkbox" },
  {
    name: "isPublic",
    label: "Нийтэд харагдана",
    type: "checkbox",
    defaultChecked: true,
  },
  { name: "sortOrder", label: "Эрэмбэ", type: "number" },
];

/** Portrait card: jersey-number watermark, position pill, stat strip. */
const playerCard: CollectionConfig["card"] = {
  aspect: "4/5",
  imageField: "photo",
  imagePositionField: "photoPosition",
  imageScaleField: "photoScale",
  watermarkField: "number",
  pills: (row) => (
    <>
      {asText(row, "position") ? (
        <MediaPill>{asText(row, "position")}</MediaPill>
      ) : null}
      {row.isCaptain ? (
        <span className="bg-ink rounded-full px-2 py-0.5 text-[12px] font-semibold text-white">
          Ахлагч
        </span>
      ) : null}
    </>
  ),
  title: asTextFn("name"),
  meta: (row) =>
    [
      row.heightCm ? `${String(row.heightCm)} см` : null,
      asText(row, "hometown") || null,
      asText(row, "academicYear") || null,
    ]
      .filter(Boolean)
      .join(" · "),
  status: (row) => visible(row, "isPublic"),
  extras: (row) =>
    row.ppg || row.rpg || row.apg ? (
      <div className="text-muted-foreground mt-auto grid grid-cols-3 gap-1 pt-2 text-center text-[12px]">
        {(
          [
            ["PPG", row.ppg],
            ["RPG", row.rpg],
            ["APG", row.apg],
          ] as const
        ).map(([label, value]) => (
          <span key={label}>
            <b className="text-card-foreground block text-sm font-bold">
              {String(value ?? "—")}
            </b>
            {label}
          </span>
        ))}
      </div>
    ) : null,
};

// ─── Удирдлага (Executives) ─────────────────────────────────────────────────

const EXEC_GROUPS: Record<string, string> = {
  BUSINESS: "Бизнес",
  COACHES: "Дасгалжуулагчид",
  OPERATIONS: "Спортын",
  OWNERSHIP: "Эзэмшил",
  STAFF: "Ажилтнууд",
};

// ─── Галерей (Media albums) ─────────────────────────────────────────────────

const ALBUM_CATEGORIES: Record<string, string> = {
  COMMUNITY: "Нийгмийн",
  EVENTS: "Арга хэмжээ",
  GAMES: "Тоглолт",
};

// ─── Видео ──────────────────────────────────────────────────────────────────

const VIDEO_CATEGORIES: Record<string, string> = {
  BEHIND_THE_SCENES: "Ар тал",
  HIGHLIGHTS: "Онцлох",
  INTERVIEWS: "Ярилцлага",
  PRESS: "Хэвлэл",
};

// ─── Дэлгүүр (Shop products) ────────────────────────────────────────────────

const SHOP_CATEGORIES: Record<string, string> = {
  GEAR: "Хэрэгсэл",
  HATS: "Малгай",
  HOODIES: "Худи",
  JERSEYS: "Өмсгөл",
  KIDS: "Хүүхдэд",
  TEES: "Цамц",
};

// ─── Тоглолтууд (Games / schedule) ─────────────────────────────────────────

const GAME_STATUS = [
  { value: "SCHEDULED", label: "Товлогдсон" },
  { value: "FINAL", label: "Дууссан" },
  { value: "CANCELLED", label: "Цуцалсан" },
];

const ubDateTime = new Intl.DateTimeFormat("mn-MN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ulaanbaatar",
});

export function PlayersManager() {
  return (
    <CollectionManager
      config={{
        title: "Тоглогчид",
        description: "Багийн бүрэлдэхүүн — портрет карт харагдацтай.",
        endpoint: "/content/players",
        listQuery: { includeHidden: "true", role: "PLAYER" },
        fields: PLAYER_FIELDS,
        card: playerCard,
        createDefaults: { role: "PLAYER" },
      }}
    />
  );
}

export function StaffManager() {
  return (
    <CollectionManager
      config={{
        title: "Багийн ажилчид",
        description: "Дасгалжуулагчид, багийн ажилтнууд.",
        endpoint: "/content/players",
        listQuery: { includeHidden: "true" },
        filter: (row) => row.role === "COACH" || row.role === "STAFF",
        fields: [
          { name: "name", label: "Нэр", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "name",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "role",
            label: "Төрөл",
            type: "select",
            required: true,
            options: [
              { label: "Дасгалжуулагч", value: "COACH" },
              { label: "Ажилтан", value: "STAFF" },
            ],
          },
          { name: "position", label: "Албан тушаал", type: "text" },
          { name: "photo", label: "Зураг (Cloudinary)", type: "image" },
          { name: "bio", label: "Товч танилцуулга", type: "textarea" },
          {
            name: "isPublic",
            label: "Нийтэд харагдана",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "4/5",
          imageField: "photo",
          pills: (row) => (
            <>
              <MediaPill>
                {row.role === "COACH" ? "Дасгалжуулагч" : "Ажилтан"}
              </MediaPill>
              {asText(row, "position") ? (
                <MediaPill>{asText(row, "position")}</MediaPill>
              ) : null}
            </>
          ),
          title: asTextFn("name"),
          meta: (row) => asText(row, "bio").slice(0, 60) || null,
          status: (row) => visible(row, "isPublic"),
        },
        createDefaults: { role: "COACH" },
      }}
    />
  );
}

export function ManagementManager() {
  return (
    <CollectionManager
      config={{
        title: "Удирдлага",
        description:
          "Front office — эзэмшил, спортын болон бизнесийн удирдлага.",
        endpoint: "/content/executives",
        listQuery: { includeHidden: "true" },
        fields: [
          { name: "name", label: "Нэр", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "name",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "title",
            label: "Албан тушаал",
            type: "text",
            required: true,
          },
          {
            name: "group",
            label: "Бүлэг",
            type: "select",
            options: [
              { label: "Эзэмшил", value: "OWNERSHIP" },
              { label: "Спортын удирдлага", value: "OPERATIONS" },
              { label: "Бизнесийн удирдлага", value: "BUSINESS" },
              { label: "Дасгалжуулагчид", value: "COACHES" },
              { label: "Ажилтнууд", value: "STAFF" },
            ],
          },
          { name: "photo", label: "Зураг (Cloudinary)", type: "image" },
          { name: "bio", label: "Товч танилцуулга", type: "textarea" },
          { name: "bullets", label: "Амжилтууд (таслалаар)", type: "list" },
          {
            name: "isPublic",
            label: "Нийтэд харагдана",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "4/5",
          imageField: "photo",
          pills: (row) =>
            row.group ? (
              <MediaPill>
                {EXEC_GROUPS[String(row.group)] ?? String(row.group)}
              </MediaPill>
            ) : null,
          title: asTextFn("name"),
          meta: (row) => asText(row, "title") || null,
          status: (row) => visible(row, "isPublic"),
        },
      }}
    />
  );
}

export function GalleryManager() {
  return (
    <CollectionManager
      config={{
        title: "Галерей",
        description:
          "Фото цомог — зургуудыг Cloudinary-ээс URL-аар нэмнэ эсвэл шууд хуулна.",
        endpoint: "/content/media",
        listQuery: { includeHidden: "true" },
        fields: [
          { name: "title", label: "Цомгийн нэр", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "title",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "category",
            label: "Ангилал",
            type: "select",
            options: [
              { label: "Тоглолтууд", value: "GAMES" },
              { label: "Нийгмийн ажил", value: "COMMUNITY" },
              { label: "Арга хэмжээнүүд", value: "EVENTS" },
            ],
          },
          {
            name: "coverImage",
            label: "Ковер зураг (Cloudinary)",
            type: "image",
          },
          {
            name: "images",
            label: "Зургууд (нэг URL нэг мөр)",
            type: "images",
          },
          {
            name: "isPublished",
            label: "Нийтэд харагдана",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "4/3",
          imageField: "coverImage",
          pills: (row) =>
            row.category ? (
              <MediaPill>
                {ALBUM_CATEGORIES[String(row.category)] ?? String(row.category)}
              </MediaPill>
            ) : null,
          title: asTextFn("title"),
          meta: (row) => {
            const count = Array.isArray(row.images)
              ? (row.images as unknown[]).length
              : 0;
            const date = row.eventDate
              ? new Date(String(row.eventDate)).toLocaleDateString("mn-MN")
              : null;
            return (
              [count ? `${count} зураг` : null, date]
                .filter(Boolean)
                .join(" · ") || null
            );
          },
          status: (row) => visible(row, "isPublished"),
        },
      }}
    />
  );
}

export function VideosManager() {
  return (
    <CollectionManager
      config={{
        title: "Бичлэгүүд",
        description:
          "Бичлэгүүдийн сан — YouTube линк хуулж нэмэхэд дүрс, нүүр зураг нь автоматаар танигдана.",
        endpoint: "/content/videos",
        listQuery: { includeHidden: "true" },
        fields: [
          { name: "title", label: "Гарчиг", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "title",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "category",
            label: "Ангилал",
            type: "select",
            options: [
              { label: "Онцлох шилдэгүүд", value: "HIGHLIGHTS" },
              { label: "Ярилцлага", value: "INTERVIEWS" },
              { label: "Хаалттай дасгалжуулалт", value: "BEHIND_THE_SCENES" },
              { label: "Хэвлэлийн бага хурал", value: "PRESS" },
            ],
          },
          {
            name: "youtubeId",
            label: "YouTube линк",
            type: "youtube",
            autoPosterField: "thumbnail",
          },
          {
            name: "thumbnail",
            label: "Нүүр зураг (хоосон үлдвэл YouTube-оос автоматаар)",
            type: "image",
          },
          {
            name: "videoUrl",
            label: "Видео URL (mp4/hls, бол вол)",
            type: "text",
          },
          { name: "durationSec", label: "Хугацаа (сек)", type: "number" },
          { name: "isFeatured", label: "Онцлох", type: "checkbox" },
          {
            name: "isPublished",
            label: "Нийтэд харагдана",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "16/10",
          imageField: "thumbnail",
          fallbackIcon: VideoIcon,
          pills: (row) => (
            <>
              {row.category ? (
                <MediaPill>
                  {VIDEO_CATEGORIES[String(row.category)] ??
                    String(row.category)}
                </MediaPill>
              ) : null}
              {row.isFeatured ? (
                <span className="bg-ink rounded-full px-2 py-0.5 text-[12px] font-semibold text-white">
                  Онцлох
                </span>
              ) : null}
            </>
          ),
          title: asTextFn("title"),
          meta: (row) =>
            row.durationSec
              ? `${Math.floor(Number(row.durationSec) / 60)}:${String(Number(row.durationSec) % 60).padStart(2, "0")}`
              : null,
          status: (row) => visible(row, "isPublished"),
        },
      }}
    />
  );
}

export function ShopManager() {
  return (
    <CollectionManager
      config={{
        title: "Дэлгүүр",
        description: "Мерчийн бүтээгдэхүүнүүд — үнэ төгрөгөөр.",
        endpoint: "/content/shop",
        listQuery: { includeHidden: "true" },
        fields: [
          { name: "name", label: "Нэр", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "name",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "category",
            label: "Ангилал",
            type: "select",
            options: [
              { label: "Өмсгөл", value: "JERSEYS" },
              { label: "Фэнүүдийн цамц", value: "TEES" },
              { label: "Худи", value: "HOODIES" },
              { label: "Малгай", value: "HATS" },
              { label: "Хүүхдэд", value: "KIDS" },
              { label: "Хэрэгсэл", value: "GEAR" },
            ],
          },
          { name: "price", label: "Үнэ (₮)", type: "number", required: true },
          {
            name: "compareAtPrice",
            label: "Хямдалаас өмнөх үнэ (₮)",
            type: "number",
          },
          { name: "image", label: "Зураг (Cloudinary)", type: "image" },
          { name: "url", label: "Гадаад линк (бол вол)", type: "text" },
          {
            name: "sizes",
            label: "Хэмжээсүүд (таслалаар)",
            type: "list",
            placeholder: "S, M, L, XL",
          },
          { name: "badge", label: "Тэмдэг", type: "text", placeholder: "Шинэ" },
          {
            name: "isVisible",
            label: "Харагдана",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "1/1",
          imageField: "image",
          fallbackIcon: Shirt,
          pills: (row) => (
            <>
              {row.category ? (
                <MediaPill>
                  {SHOP_CATEGORIES[String(row.category)] ??
                    String(row.category)}
                </MediaPill>
              ) : null}
              {asText(row, "badge") ? (
                <span className="bg-ink rounded-full px-2 py-0.5 text-[12px] font-semibold text-white">
                  {asText(row, "badge")}
                </span>
              ) : null}
            </>
          ),
          title: asTextFn("name"),
          meta: (row) =>
            Array.isArray(row.sizes) && row.sizes.length
              ? (row.sizes as string[]).join("/")
              : null,
          status: (row) => visible(row, "isVisible"),
          extras: (row) => (
            <p className="mt-auto pt-2 text-sm font-bold">
              {Number(row.price ?? 0).toLocaleString()} ₮
              {row.compareAtPrice ? (
                <span className="text-muted-foreground ml-1.5 text-xs font-medium line-through">
                  {Number(row.compareAtPrice).toLocaleString()} ₮
                </span>
              ) : null}
            </p>
          ),
        },
      }}
    />
  );
}

// ─── Мэдээ (News) ───────────────────────────────────────────────────────────

export function NewsManager() {
  return (
    <CollectionManager
      config={{
        title: "Мэдээ",
        description: "Сайтын мэдээ, зарлагууд.",
        endpoint: "/content/news",
        listQuery: { includeHidden: "true" },
        fields: [
          { name: "title", label: "Гарчиг", type: "text", required: true },
          {
            name: "slug",
            slugFrom: "title",
            label: "Slug (URL нэр)",
            type: "text",
            required: true,
          },
          {
            name: "excerpt",
            label: "Хураангуй",
            type: "textarea",
            required: true,
          },
          {
            name: "content",
            label: "Агуулга",
            type: "textarea",
            required: true,
          },
          {
            name: "coverImage",
            label: "Ковер зураг (Cloudinary)",
            type: "image",
          },
          {
            name: "category",
            label: "Ангилал",
            type: "text",
            placeholder: "Мэдээ",
          },
          { name: "tags", label: "Тагууд (таслалаар)", type: "list" },
          {
            name: "publishedAt",
            label: "Нийтэлсэн огноо (Улаанбаатар)",
            type: "datetime",
          },
          {
            name: "isFeatured",
            label: "Онцлох (нүүр хуудасны том картад эхэлж гарна)",
            type: "checkbox",
          },
          {
            name: "isPublished",
            label: "Нийтэлсэн",
            type: "checkbox",
            defaultChecked: true,
          },
          { name: "sortOrder", label: "Эрэмбэ", type: "number" },
        ],
        card: {
          aspect: "16/10",
          imageField: "coverImage",
          pills: (row) => (
            <>
              {asText(row, "category") ? (
                <MediaPill>{asText(row, "category")}</MediaPill>
              ) : null}
              {row.isFeatured ? (
                <span className="bg-ink rounded-full px-2 py-0.5 text-[12px] font-semibold text-white">
                  Онцлох
                </span>
              ) : null}
            </>
          ),
          title: asTextFn("title"),
          meta: (row) =>
            [
              row.publishedAt
                ? new Date(String(row.publishedAt)).toLocaleDateString("mn-MN")
                : null,
              asText(row, "excerpt").slice(0, 50) || null,
            ]
              .filter(Boolean)
              .join(" · ") || null,
          status: (row) => visible(row, "isPublished"),
        },
      }}
    />
  );
}

export function GamesManager() {
  return (
    <CollectionManager
      config={{
        title: "Тоглолтууд",
        description:
          "Хуваарь, үр дүн. Өрсөлдөгчийн лого, өнгө нүүр хуудасны онооны картад харагдана.",
        endpoint: "/content/games",
        listQuery: { limit: "100" },
        fields: [
          {
            name: "opponent",
            label: "Өрсөлдөгч баг",
            type: "text",
            required: true,
            placeholder: "NUM Falcons",
          },
          {
            name: "opponentShort",
            label: "Богино нэр (утсан дээр)",
            type: "text",
            placeholder: "Falcons",
          },
          { name: "opponentLogo", label: "Өрсөлдөгчийн лого", type: "image" },
          {
            name: "opponentColor",
            label: "Өрсөлдөгчийн өнгө",
            type: "color",
          },
          {
            name: "tipsAt",
            label: "Эхлэх цаг (Улаанбаатар)",
            type: "datetime",
            required: true,
          },
          { name: "venue", label: "Байршил", type: "text" },
          { name: "competition", label: "Тэмцээн", type: "text" },
          { name: "round", label: "Шат / тойрог", type: "text" },
          {
            name: "isHome",
            label: "Талбай дээрээ",
            type: "checkbox",
            defaultChecked: true,
          },
          {
            name: "status",
            label: "Төлөв",
            type: "select",
            options: GAME_STATUS,
          },
          { name: "teamScore", label: "Манай оноо", type: "number" },
          { name: "opponentScore", label: "Өрсөлдөгчийн оноо", type: "number" },
          { name: "streamUrl", label: "Шууд дамжуулалт (URL)", type: "text" },
          { name: "ticketUrl", label: "Тасалбар (URL)", type: "text" },
          { name: "note", label: "Тэмдэглэл", type: "textarea" },
        ],
        card: {
          aspect: "16/10",
          imageField: "opponentLogo",
          fallbackIcon: CalendarDays,
          pills: (row) =>
            typeof row.opponentColor === "string" && row.opponentColor ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold"
                title="Өрсөлдөгчийн өнгө"
              >
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full border border-black/10"
                  style={{ backgroundColor: row.opponentColor }}
                />
                {row.opponentColor}
              </span>
            ) : null,
          title: asTextFn("opponent"),
          meta: (row) =>
            [
              row.tipsAt
                ? ubDateTime.format(new Date(String(row.tipsAt)))
                : null,
              asText(row, "venue") || null,
            ]
              .filter(Boolean)
              .join(" · ") || null,
          extras: (row) =>
            row.status === "FINAL" ? (
              <span className="text-sm font-semibold tabular-nums">
                {String(row.teamScore ?? "–")} :{" "}
                {String(row.opponentScore ?? "–")}
              </span>
            ) : null,
          status: (row) =>
            row.status === "FINAL"
              ? { label: "Дууссан", tone: "neutral" as const }
              : row.status === "CANCELLED"
                ? { label: "Цуцалсан", tone: "amber" as const }
                : { label: "Товлогдсон", tone: "green" as const },
        },
      }}
    />
  );
}
