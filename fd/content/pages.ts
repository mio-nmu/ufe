/**
 * Offline fallbacks for the new pages. Each mirrors what bd/prisma/seed.ts
 * registers so a page still renders (build time, backend down) — the live
 * API data replaces it whenever the fetch succeeds.
 */

import type {
  Executive,
  GameRow,
  MediaAlbumRow,
  ShopProductRow,
  VideoRow,
} from "@/types/content";

// ── Удирдлага (front office) ────────────────────────────────────────────────

export const frontOfficeFallback: Executive[] = [
  {
    bio: "Санхүү, эдийн засгийн их сургуулийн ректор. Спортын багуудын хөгжлийг их сургуулийн бодлогын тэргүүлэх чиглэл болгож, шигшээ багийн үйл ажиллагааг бүх талаар дэмждэг.",
    bullets: ["СЭЗИС-ийн ректор", "Их сургуулийн спортын бодлогын удирдагч"],
    group: "OWNERSHIP",
    id: "fb-own-1",
    name: "Д.Мөнхбаяр",
    photo: null,
    slug: "d-munkhbayar",
    sortOrder: 1,
    title: "СЭЗИС-ийн ректор",
  },
  {
    bio: "Их сургуулийн хичээлийн болон спортын үйл ажиллагааны асуудал эрхэлсэн дэд ректор. Заал, дасгалжуулах багийн нөхцөлийг сайжруулах ажлыг манлайлдаг.",
    bullets: [],
    group: "OWNERSHIP",
    id: "fb-own-2",
    name: "П.Энхбаатар",
    photo: null,
    slug: "p-enkhbaatar",
    sortOrder: 2,
    title: "Боловсролын асуудал эрхэлсэн дэд ректор",
  },
  {
    bio: "Шигшээ багийн өдөр тутмын үйл ажиллагаа, тоглолтын бэлтгэл, тэмцээний бүртгэлийг хариуцна.",
    bullets: [],
    group: "OPERATIONS",
    id: "fb-ops-1",
    name: "Б.Энхжин",
    photo: null,
    slug: "b-enkhjin",
    sortOrder: 1,
    title: "Багийн менежер",
  },
  {
    bio: "Тоглолт бүрийн статистик мэдээллийг боловсруулж, дасгалжуулагчдын штабт шинжилгээгээр хувь нэмэр оруулна.",
    bullets: [],
    group: "OPERATIONS",
    id: "fb-ops-2",
    name: "М.Хүслэн",
    photo: null,
    slug: "m-khuslen",
    sortOrder: 2,
    title: "Статистик аналитик",
  },
  {
    bio: "Тамирчдын бэртэл гэмтлийн урьдчилан сэргийлэх, сэргээн засах ажиллагааг мэргэжлийн түвшинд эрхэлнэ.",
    bullets: [],
    group: "OPERATIONS",
    id: "fb-ops-3",
    name: "Г.Ану",
    photo: null,
    slug: "g-anu",
    sortOrder: 3,
    title: "Багийн эмч, сэргээгч",
  },
  {
    bio: "Багийн брендийн мэдээлэл, хэвлэл мэдээллийн харилцаа, ивээн тэтгэгчидтэй хамтын ажиллагааг манлайлна.",
    bullets: [],
    group: "BUSINESS",
    id: "fb-biz-1",
    name: "С.Нарангэрэл",
    photo: null,
    slug: "s-narangerel",
    sortOrder: 1,
    title: "Маркетингийн менежер",
  },
  {
    bio: "ХААН Банк, BRB, Redbull, Circle Ball зэрэг ивээн тэтгэгчидтэй харилцаа, гэрээ хэлэлцээрийг хариуцна.",
    bullets: [],
    group: "BUSINESS",
    id: "fb-biz-2",
    name: "Э.Батболд",
    photo: null,
    slug: "e-batbold",
    sortOrder: 2,
    title: "Ивээн тэтгэгчийн харилцааны менежер",
  },
  {
    bio: "Фэн клаб, дэлгүүрийн бүтээгдэхүүн, тоглолтын үйл ажиллагааны борлуулалтыг зохион байгуулна.",
    bullets: [],
    group: "BUSINESS",
    id: "fb-biz-3",
    name: "Д.Уянга",
    photo: null,
    slug: "d-uyanga",
    sortOrder: 3,
    title: "Борлуулалтын менежер",
  },
  {
    bio: "Бужинлхам Пүрэвдорж. Сагсан бөмбөгийн олон улсын хэмжээний мастер (ОУХМ).",
    bullets: [
      "MCBA 2025–2026 оны жилийн шилдэг дасгалжуулагч (Coach of the Year)",
      "2025–2026 онд СЭЗИС-ийн шигшээ багийг түүхэндээ анх удаа Оюутны лигийн аварга болгосон",
    ],
    group: "COACHES",
    id: "fb-co-1",
    name: "Б.Пүрэвдорж",
    photo: null,
    slug: "b-purevdorj",
    sortOrder: 1,
    title: "Ерөнхий дасгалжуулагч",
  },
  {
    bio: "Дашпунцаг Амьбох. Монголын сагсан бөмбөгийн хөгжилд дасгалжуулагч, шүүгч, удирдлагын хувиар үнэтэй хувь нэмэр оруулсан эрхэм.",
    bullets: [
      "1994–1995: Монголын лигийн анхны улирлын ерөнхий шүүгч",
      "1998–2005: СЭЗДС-ийн эрэгтэй шигшээ багийн ахлах дасгалжуулагч",
      "1993 онд МСБХ-ны “Улсын шүүгч” цол хүртсэн",
    ],
    group: "COACHES",
    id: "fb-co-2",
    name: "Д.Амьбох",
    photo: null,
    slug: "d-ambokh",
    sortOrder: 2,
    title: "Дасгалжуулагч, шүүгч",
  },
  {
    bio: "Тамирчдын хүч чадал, хөдөлгөөний бэлтгэлийг мэргэжлийн түвшинд хангана.",
    bullets: [],
    group: "COACHES",
    id: "fb-co-3",
    name: "Ц.Ганбат",
    photo: null,
    slug: "ts-ganbat",
    sortOrder: 3,
    title: "Бэлтгэлийн дасгалжуулагч",
  },
];

export const frontOfficeHeroFallback = {
  intro:
    "Талбай дээрх болон талбайн гаднах баг — СЭЗИС-ийн шигшээ багийг удирдаж буй хүмүүс.",
};

// ── Хуваарь (schedule) ───────────────────────────────────────────────────────

function gameAt(date: string, hourUtc = 11): string {
  return `${date}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`;
}

export const scheduleFallback: GameRow[] = [
  {
    competition:
      "Их сургуулиудын сагсан бөмбөгийн аварга шалгаруулах тэмцээн 2026/27",
    id: "000000000000000000000001",
    isHome: true,
    note: "Opening match",
    opponent: "NUM Falcons",
    opponentLogo: null,
    opponentScore: null,
    opponentShort: "NUM Falcons",
    round: "I тойрог",
    status: "SCHEDULED",
    streamUrl: null,
    teamScore: null,
    ticketUrl: null,
    tipsAt: gameAt("2026-10-24", 10),
    venue: "Steppe Arena",
  },
];

export const scheduleHeroFallback = {
  intro:
    "Их сургуулиудын сагсан бөмбөгийн аварга шалгаруулах тэмцээний 2026/27 оны хуваарь, үр дүн, тасалбар болон шууд дамжуулалтын холбоосууд.",
};

// ── Фото (photos) ────────────────────────────────────────────────────────────

export const photosFallback: MediaAlbumRow[] = [
  {
    category: "GAMES",
    coverImage: null,
    eventDate: "2026-09-19T00:00:00.000Z",
    id: "fb-al1",
    images: [],
    slug: "ulirliin-neelt",
    sortOrder: 1,
    title: "Улирлын нээлтийн тоглолт",
  },
  {
    category: "COMMUNITY",
    coverImage: null,
    eventDate: "2026-09-15T00:00:00.000Z",
    id: "fb-al2",
    images: [],
    slug: "beltgeliin-surguulilt",
    sortOrder: 2,
    title: "Бэлтгэл сургуулилтаас",
  },
  {
    category: "GAMES",
    coverImage: null,
    eventDate: "2026-09-26T00:00:00.000Z",
    id: "fb-al3",
    images: [],
    slug: "sezis-shutis-toglots",
    sortOrder: 3,
    title: "СЭЗИС — ШУТИС тоглолтоос",
  },
  {
    category: "EVENTS",
    coverImage: null,
    eventDate: "2026-09-30T00:00:00.000Z",
    id: "fb-al4",
    images: [],
    slug: "avargiin-bayrlalaa",
    sortOrder: 4,
    title: "Аваргын баяр ёслол",
  },
  {
    category: "COMMUNITY",
    coverImage: null,
    eventDate: "2026-10-04T00:00:00.000Z",
    id: "fb-al5",
    images: [],
    slug: "oyutnii-surguulilt",
    sortOrder: 5,
    title: "Оюутны сургуулилт, танилцуулга",
  },
  {
    category: "GAMES",
    coverImage: null,
    eventDate: "2026-10-11T00:00:00.000Z",
    id: "fb-al6",
    images: [],
    slug: "sezis-izuis-toglots",
    sortOrder: 6,
    title: "СЭЗИС — ИЗҮИС тоглолтоос",
  },
];

// ── Видео (videos) ───────────────────────────────────────────────────────────

function vid(
  id: string,
  title: string,
  slug: string,
  category: VideoRow["category"],
  durationSec: number,
  publishedAt: string,
  isFeatured = false,
): VideoRow {
  return {
    category,
    durationSec,
    id,
    isFeatured,
    publishedAt,
    slug,
    thumbnail: null,
    title,
    videoUrl: null,
    youtubeId: null,
  };
}

export const videosFallback: VideoRow[] = [
  vid(
    "fb-v1",
    "Аваргын тоглолтын онцлох мийчлүүд",
    "avargiin-togoltsiin-ontsloh-miguul",
    "HIGHLIGHTS",
    190,
    "2026-09-27T09:00:00.000Z",
    true,
  ),
  vid(
    "fb-v2",
    "СЭЗИС — ШУТИС: Топ 10 шидэлт",
    "sezis-shutis-top-10",
    "HIGHLIGHTS",
    154,
    "2026-09-26T09:00:00.000Z",
  ),
  vid(
    "fb-v3",
    "Улирлын нээлтийн тоглолтын оноонууд",
    "ulirliin-neelt-burguulsen-onoonuud",
    "HIGHLIGHTS",
    221,
    "2026-09-20T09:00:00.000Z",
  ),
  vid(
    "fb-v4",
    "Ярилцлага: Ерөнхий дасгалжуулагч Б.Пүрэвдорж",
    "dasgaljuulagchiin-yarlaga",
    "INTERVIEWS",
    305,
    "2026-09-28T09:00:00.000Z",
  ),
  vid(
    "fb-v5",
    "Finals MVP Г.Өнөболдтой ярилцсан нь",
    "finals-mvp-yarlaga",
    "INTERVIEWS",
    262,
    "2026-09-25T09:00:00.000Z",
  ),
  vid(
    "fb-v6",
    "Бэлтгэлийн сургуулилтын ар талын амьдрал",
    "beltgeliin-surguuliultiin-ar-tal",
    "BEHIND_THE_SCENES",
    388,
    "2026-09-22T09:00:00.000Z",
  ),
  vid(
    "fb-v7",
    "Шинэ бүрэлдэхүүний сонгон шалгаруулалт",
    "shine-bureldhuun-songolt",
    "BEHIND_THE_SCENES",
    412,
    "2026-09-15T09:00:00.000Z",
  ),
  vid(
    "fb-v8",
    "Хэвлэлийн бага хурал: AUBL-д оролцох эрх",
    "aubl-erh-avsan-tuhai",
    "PRESS",
    178,
    "2026-09-29T09:00:00.000Z",
  ),
];

// ── Медиа (combined photos + videos page) ─────────────────────────────────────

export const mediaHeroFallback = {
  intro:
    "Тоглолт, нийгмийн ажил, арга хэмжээний зургууд — онцлох бичлэгүүд, ярилцлага, ар талын амьдрал.",
  /** Poster shown until the featured video has a thumbnail of its own. */
  poster: "/images/tuuh/2025/2025.png",
};

// ── Фэн клаб (fan club) ───────────────────────────────────────────────────────

export const fanClubFallback = {
  cta: "Дэлгүүр нээх",
  heroImage: "",
  promos: [
    "Шинэ хотын загварын өмсгөл захиалгаар",
    "Албан ёсны FORZA бүтээгдэхүүн",
  ],
  subtitle: "Албан ёсны бүтээгдэхүүн — FORZA үйлдвэрлэлтэй",
  title: "СЭЗИС мерч",
};

export const shopFallback: ShopProductRow[] = [
  {
    badge: null,
    category: "JERSEYS",
    compareAtPrice: null,
    id: "fb-p1",
    image: null,
    name: "Хотын загварын өмсгөл 2026/27",
    price: 189000,
    sizes: ["S", "M", "L", "XL"],
    slug: "city-edition-jersey",
    url: null,
  },
  {
    badge: null,
    category: "JERSEYS",
    compareAtPrice: null,
    id: "fb-p2",
    image: null,
    name: "Гэрэйн өмсгөл 2026/27",
    price: 175000,
    sizes: ["S", "M", "L", "XL"],
    slug: "home-jersey",
    url: null,
  },
  {
    badge: "Хямдрал",
    category: "JERSEYS",
    compareAtPrice: 175000,
    id: "fb-p3",
    image: null,
    name: "Зочны өмсгөл 2026/27",
    price: 149000,
    sizes: ["S", "M", "L"],
    slug: "away-jersey",
    url: null,
  },
  {
    badge: null,
    category: "TEES",
    compareAtPrice: null,
    id: "fb-p4",
    image: null,
    name: "Аваргын тусгай дизайн Ti-шерт",
    price: 55000,
    sizes: ["S", "M", "L", "XL"],
    slug: "championship-tee",
    url: null,
  },
  {
    badge: null,
    category: "TEES",
    compareAtPrice: null,
    id: "fb-p5",
    image: null,
    name: "Багийн logo буух хувица",
    price: 45000,
    sizes: ["S", "M", "L"],
    slug: "logo-tee",
    url: null,
  },
  {
    badge: null,
    category: "HOODIES",
    compareAtPrice: null,
    id: "fb-p6",
    image: null,
    name: "СЭЗИС хүйтэн улиралын худи",
    price: 95000,
    sizes: ["M", "L", "XL"],
    slug: "sezis-hoodie",
    url: null,
  },
  {
    badge: null,
    category: "HATS",
    compareAtPrice: null,
    id: "fb-p7",
    image: null,
    name: "Snapback малгай — хар",
    price: 39000,
    sizes: [],
    slug: "snapback-hat",
    url: null,
  },
  {
    badge: null,
    category: "KIDS",
    compareAtPrice: null,
    id: "fb-p8",
    image: null,
    name: "Хүүхдийн өмсгөл — ахлагчын дугаартай",
    price: 85000,
    sizes: ["8", "10", "12"],
    slug: "kids-jersey",
    url: null,
  },
  {
    badge: null,
    category: "GEAR",
    compareAtPrice: null,
    id: "fb-p9",
    image: null,
    name: "Албан ёсны бөмбөг — Team Edition",
    price: 120000,
    sizes: [],
    slug: "official-basketball",
    url: null,
  },
];
