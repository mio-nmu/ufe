"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Mail, Minus, Plus } from "lucide-react";

import type { ShopCategory, ShopProductRow } from "@/types/content";
import { teamButtonClass } from "@/components/team/button";
import { cn } from "@/lib/utils";

/**
 * Fan club shop: 40px rotating promo bar (slides every 5s), split hero,
 * category chips, a 260px size/price filter rail (collapsible sections on
 * 48px hairline rows) and a 3-column product grid. Every product card ends
 * in an action: the store link when the admin set one, otherwise an order
 * e-mail prefilled with the product name.
 */

const CATEGORIES: Array<{ value: ShopCategory | "ALL"; label: string }> = [
  { value: "ALL", label: "Бүгд" },
  { value: "JERSEYS", label: "Өмсгөл" },
  { value: "TEES", label: "Ti-шерт" },
  { value: "HOODIES", label: "Худи" },
  { value: "HATS", label: "Малгай" },
  { value: "KIDS", label: "Хүүхдэд" },
  { value: "GEAR", label: "Хэрэгсэл" },
];

const PRICE_BANDS = [
  { value: "all", label: "Бүгд", test: () => true },
  { value: "low", label: "50,000₮ хүртэл", test: (p: number) => p < 50_000 },
  {
    value: "mid",
    label: "50–100 мянган ₮",
    test: (p: number) => p >= 50_000 && p <= 100_000,
  },
  { value: "high", label: "100,000₮+", test: (p: number) => p > 100_000 },
] as const;

export interface FanClubContent {
  title: string;
  subtitle: string;
  cta: string;
  heroImage: string;
  promos: string[];
  /** Order inbox for products without a store link. */
  orderEmail: string;
}

export function FanClubShop({
  products,
  content,
}: {
  products: ShopProductRow[];
  content: FanClubContent;
}) {
  const [promoIndex, setPromoIndex] = useState(0);
  const [category, setCategory] = useState<ShopCategory | "ALL">("ALL");
  const [sizes, setSizes] = useState<string[]>([]);
  const [band, setBand] =
    useState<(typeof PRICE_BANDS)[number]["value"]>("all");

  // Rotating promo bar — slide every 5s.
  useEffect(() => {
    if (content.promos.length <= 1) return;
    const timer = window.setInterval(
      () => setPromoIndex((index) => (index + 1) % content.promos.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [content.promos.length]);

  const availableSizes = useMemo(
    () => [...new Set(products.flatMap((product) => product.sizes))],
    [products],
  );

  const filtered = products.filter((product) => {
    if (category !== "ALL" && product.category !== category) return false;
    if (sizes.length > 0 && !product.sizes.some((size) => sizes.includes(size)))
      return false;
    const bandDef = PRICE_BANDS.find((option) => option.value === band);
    return bandDef ? bandDef.test(product.price) : true;
  });

  return (
    <>
      {/* Rotating promo bar */}
      {content.promos.length > 0 ? (
        <div className="bg-brand-2 text-paper flex h-10 items-center justify-center overflow-hidden">
          <p
            key={promoIndex}
            className="view-swap px-4 text-center text-[12px] font-semibold tracking-[0.12em] uppercase"
            aria-live="polite"
          >
            {content.promos[promoIndex]}
          </p>
        </div>
      ) : null}

      {/* Split hero — inside the site container so its edges match the
          header and the catalog below. */}
      <section className="bg-paper-soft border-line border-b">
        <div
          className={cn(
            "team-shell grid gap-8 py-12 md:py-16",
            content.heroImage && "md:grid-cols-2 md:items-center",
          )}
        >
          <div className="flex flex-col items-start gap-6">
            <h1 className="font-display text-ink text-[clamp(40px,6vw,64px)] leading-[0.95] font-bold tracking-[0.02em] uppercase">
              {content.title}
            </h1>
            <p className="text-mute max-w-md text-[15px] leading-[1.6]">
              {content.subtitle}
            </p>
            <a href="#catalog" className={teamButtonClass()}>
              {content.cta}
            </a>
          </div>
          {content.heroImage ? (
            <div className="bg-paper-muted border-line relative hidden aspect-[4/3] overflow-hidden rounded-lg border md:block">
              <Image
                src={content.heroImage}
                alt=""
                fill
                sizes="50vw"
                className="object-cover"
                priority
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Category chips — the one category control (the rail filters
          size and price only). */}
      <div
        role="group"
        aria-label="Ангилал"
        className="team-shell mt-10 flex flex-wrap gap-2"
      >
        {CATEGORIES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setCategory(option.value)}
            aria-pressed={category === option.value}
            className={teamButtonClass({
              size: "sm",
              variant: category === option.value ? "primary" : "secondary",
            })}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Filter rail + product grid */}
      <div
        id="catalog"
        className="team-shell mt-10 grid scroll-mt-24 gap-8 pb-16 md:scroll-mt-32 md:pb-20 lg:grid-cols-[240px_1fr] lg:gap-10"
      >
        <aside aria-label="Шүүлтүүр">
          <h2 className="font-display text-ink text-[20px] font-bold tracking-[0.02em] uppercase">
            Шүүлтүүр
          </h2>

          {availableSizes.length > 0 ? (
            <FilterSection title="Хэмжээ" defaultOpen>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const active = sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setSizes((current) =>
                          current.includes(size)
                            ? current.filter((item) => item !== size)
                            : [...current, size],
                        )
                      }
                      className={cn(
                        "font-display team-focus inline-flex h-9 min-w-10 items-center justify-center rounded-full border px-3 text-[13px] font-semibold transition-colors",
                        active
                          ? "border-ink bg-ink/5 text-ink"
                          : "border-line text-mute hover:border-ink hover:text-ink",
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </FilterSection>
          ) : null}

          <FilterSection title="Үнэ" defaultOpen={false}>
            <div className="flex flex-col gap-2">
              {PRICE_BANDS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <input
                    type="radio"
                    name="fan-price"
                    checked={band === option.value}
                    onChange={() => setBand(option.value)}
                    className="accent-ink size-4"
                  />
                  <span className="text-[14px]">{option.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        </aside>

        <div>
          <p className="text-mute mb-4 text-[12px] font-semibold tracking-[0.12em] uppercase">
            {filtered.length} бүтээгдэхүүн
          </p>
          <div
            key={`${category}-${band}-${sizes.join()}`}
            className="view-swap grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                orderEmail={content.orderEmail}
              />
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="border-line flex flex-col items-center gap-4 rounded-lg border border-dashed py-12 text-center">
              <p className="text-mute text-sm">
                Шүүлтүүрт тохирох бүтээгдэхүүн олдсонгүй.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCategory("ALL");
                  setSizes([]);
                  setBand("all");
                }}
                className={teamButtonClass({
                  size: "sm",
                  variant: "secondary",
                })}
              >
                Шүүлтүүр цэвэрлэх
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function FilterSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-line border-t">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="team-focus flex min-h-12 w-full items-center justify-between text-left"
      >
        <span className="text-ink text-[14px] font-semibold">{title}</span>
        {open ? (
          <Minus className="text-mute size-4" aria-hidden="true" />
        ) : (
          <Plus className="text-mute size-4" aria-hidden="true" />
        )}
      </button>
      {open ? <div className="view-swap pb-4">{children}</div> : null}
    </div>
  );
}

function ProductCard({
  product,
  orderEmail,
}: {
  product: ShopProductRow;
  orderEmail: string;
}) {
  const orderHref = `mailto:${orderEmail}?subject=${encodeURIComponent(
    `Мерч захиалга: ${product.name}`,
  )}`;

  return (
    <article className="card-lift border-line bg-paper flex flex-col overflow-hidden rounded-lg border">
      <div className="bg-paper-soft relative aspect-square overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover"
          />
        ) : (
          <span className="font-display text-mute/35 flex h-full items-center justify-center px-6 text-center text-[13px] font-semibold tracking-[0.12em] uppercase">
            {product.name}
          </span>
        )}
        {product.badge ? (
          <span className="bg-ink text-paper absolute top-2 left-2 rounded-full px-2 py-0.5 text-[12px] font-semibold tracking-[0.06em] uppercase">
            {product.badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-ink line-clamp-2 min-h-[42px] text-[16px] leading-[1.3]">
          {product.name}
        </h3>
        <p className="mt-1.5 text-[18px] font-semibold">
          {formatMnt(product.price)}{" "}
          {product.compareAtPrice ? (
            <s className="text-mute text-[13px] font-normal">
              {formatMnt(product.compareAtPrice)}
            </s>
          ) : null}
        </p>
        {product.sizes.length > 0 ? (
          <ul aria-label="Хэмжээ" className="mt-2 flex flex-wrap gap-1.5">
            {product.sizes.map((size) => (
              <li
                key={size}
                className="border-ink/30 text-ink inline-flex h-7 items-center rounded-full border px-2.5 text-[12px] font-semibold"
              >
                {size}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto pt-4">
          {product.url ? (
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`${product.name} — худалдаж авах`}
              className={teamButtonClass({ size: "sm", className: "w-full" })}
            >
              Худалдаж авах
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          ) : (
            <a
              href={orderHref}
              aria-label={`${product.name} — захиалах`}
              className={teamButtonClass({
                size: "sm",
                variant: "secondary",
                className: "w-full",
              })}
            >
              <Mail className="size-4" aria-hidden="true" />
              Захиалах
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function formatMnt(price: number): string {
  return `${new Intl.NumberFormat("en-US").format(price)}₮`;
}
