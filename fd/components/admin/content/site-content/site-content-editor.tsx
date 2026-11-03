"use client";

import { buttonVariants } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { CopyFields } from "@/components/admin/content/site-content/copy-field-editor";
import { SectionPreview } from "@/components/admin/content/site-content/section-previews";
import type { PreviewSupport } from "@/components/admin/content/site-content/section-previews";
import {
  SITE_CONTENT_PAGES,
  normalizeSectionData,
  sectionId,
  type SitePageDef,
  type SiteSectionDef,
} from "@/components/admin/content/site-content/sections";
import { Skeleton } from "@/components/ui/skeleton";
import type { NewsItem } from "@/components/team/news-grid";
import {
  contentAdminKeys,
  useContentResource,
} from "@/hooks/use-content-admin";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api-client";
import { revalidatePublicTag } from "@/lib/admin/revalidate";
import { adminContentService } from "@/services/admin/content.service";
import { shopFallback } from "@/content/pages";
import { featuredNews, history } from "@/content/site";
import type { ShopProductRow } from "@/types/content";
import { cn } from "@/lib/utils";
import styles from "@/components/admin/content/site-content/site-content.module.css";

/**
 * Structured page-copy CMS ("Хуудасны текст"): one tab per site page, each
 * section an editor + sticky live-preview pair. Layout follows the admin
 * CMS design spec — sticky blurred toolbar (page tabs on the CMS tab,
 * status + one save everywhere), 1480px shell, 20px section rhythm —
 * skinned with the public team-site design rules (paper/ink tokens,
 * condensed uppercase headings, pill buttons, 2px ink focus rings). Fields
 * are never blank — a stored value always resolves to itself or the static
 * default — and one save persists every changed section of the active
 * page, then purges the public site-content ISR tag.
 */

interface PageCopyBody {
  page: string;
  sections: Record<string, unknown>;
}

interface SectionState {
  data: Record<string, unknown>;
  baseline: string;
}

/** Per-route rendition for /admin/text/[page] — one page's sections,
 *  driven by the sidebar; no page tabs, just the save toolbar. */
export function PageContentEditor({ pageKey }: { pageKey: string }) {
  const pageDef = SITE_CONTENT_PAGES.find((page) => page.key === pageKey);
  if (!pageDef) {
    return (
      <p className="text-muted-foreground text-sm">
        Энэ хуудсанд засварлах текст бүртгэгдээгүй.
      </p>
    );
  }
  return <PageSections key={pageDef.key} def={pageDef} />;
}

function PageSections({
  def,
  onSelect,
  onOpenTab,
}: {
  def: SitePageDef;
  /** Renders the page-tab strip when provided (CMS tab); the per-route
      /admin/text pages navigate via the sidebar, so they pass nothing. */
  onSelect?: (tab: string) => void;
  onOpenTab?: (tab: string) => void;
}) {
  const { user } = useAuth();

  // One batched query over the distinct bd pages behind this tab's
  // sections ("history" joins the home tab only so the hero preview's
  // third slide can show the live history intro).
  const pages = useMemo(() => {
    const set = new Set<string>(def.sections.map((section) => section.page));
    if (def.key === "home") set.add("history");
    return [...set];
  }, [def]);

  const copyQuery = useQuery({
    queryKey: [...contentAdminKeys.all, "page-copy-batch", pages],
    queryFn: async () => {
      const entries = await Promise.all(
        pages.map(async (page) => {
          const body = await adminContentService.getPageCopy(page);
          return [page, body] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, PageCopyBody>;
    },
    enabled: user?.role === "ADMIN",
  });

  // Preview support lists — silent failures fall back to the static lists.
  const newsQuery = useContentResource("news", "/api/v1/content/news", {
    limit: "12",
  });
  const shopQuery = useContentResource("shop", "/api/v1/content/shop");

  const [states, setStates] = useState<Record<string, SectionState>>(() =>
    buildStates(def, copyQuery.data),
  );
  const [baselineStamp, setBaselineStamp] = useState(copyQuery.dataUpdatedAt);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  // Adjust-during-render reset: when fresh payloads arrive (load or save),
  // the drafts follow without an effect.
  if (baselineStamp !== copyQuery.dataUpdatedAt) {
    setBaselineStamp(copyQuery.dataUpdatedAt);
    setStates(buildStates(def, copyQuery.data));
  }

  const support = useMemo(
    () =>
      previewSupport(
        newsQuery.data?.items,
        shopQuery.data?.items,
        copyQuery.data,
      ),
    [newsQuery.data, shopQuery.data, copyQuery.data],
  );

  const dirtySections = def.sections.filter((section) => {
    const state = states[sectionId(section)];
    return state && JSON.stringify(state.data) !== state.baseline;
  });

  const update = (section: SiteSectionDef, data: Record<string, unknown>) =>
    setStates((current) => ({
      ...current,
      [sectionId(section)]: {
        data,
        baseline: current[sectionId(section)]?.baseline ?? JSON.stringify(data),
      },
    }));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      for (const section of dirtySections) {
        await adminContentService.putPageCopy(
          section.page,
          section.section,
          states[sectionId(section)].data,
        );
      }
      toast.success("Хуудасны текст хадгалагдлаа.");
      setMessage({ kind: "ok", text: "Амжилттай хадгалагдлаа." });
      await copyQuery.refetch();
      void revalidatePublicTag("site-content");
    } catch (err) {
      const text =
        err instanceof ApiClientError
          ? err.message
          : "Хадгалахад алдаа гарлаа.";
      setMessage({ kind: "error", text });
      toast.error(text);
    } finally {
      setSaving(false);
    }
  };

  if (copyQuery.isPending) {
    return (
      <>
        <DelayedLoadingOverlay label="Агуулгын текст ачаалж байна…" />
        <div className="space-y-4">
          {def.sections.map((section) => (
            <div key={sectionId(section)} className="space-y-2">
              <Skeleton className="bg-paper-soft h-6 w-56" />
              <Skeleton className="bg-paper-soft h-40 w-full rounded-md" />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className={styles.stack}>
      {/* Sticky toolbar: page tabs (CMS tab only) + status + the single
          save. Content scrolling under it dissolves through the paper
          fade + blur. */}
      <div className={styles.toolbar}>
        <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {onSelect ? (
            <div
              role="tablist"
              aria-label="Агуулгын хуудас сонгох"
              className="flex flex-wrap gap-2"
            >
              {SITE_CONTENT_PAGES.map((page) => {
                const active = page.key === def.key;
                return (
                  <button
                    key={page.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelect(page.key)}
                    className={cn(
                      "font-display team-focus inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-line bg-paper text-mute hover:border-ink hover:text-ink",
                    )}
                  >
                    {page.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="ml-auto flex min-h-10 items-center gap-3">
            {message ? (
              <p
                role="status"
                className={cn(
                  "text-sm",
                  message.kind === "ok"
                    ? "text-ink font-medium"
                    : "text-destructive",
                )}
              >
                {message.text}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || dirtySections.length === 0}
              className={buttonVariants({ size: "lg" })}
            >
              <Save className="size-4" aria-hidden="true" />
              {saving
                ? "Хадгалж байна…"
                : dirtySections.length > 0
                  ? `Хадгалах (${dirtySections.length})`
                  : "Хадгалах"}
            </button>
          </div>
        </div>
        {copyQuery.isError ? (
          <p className="text-destructive mt-2 text-xs" role="alert">
            Хадгалсан текстийг ачаалж чадсангүй — статик нөөцөөс эхэлж байна.
            Хадгалбал дахин оролдоно.
          </p>
        ) : null}
      </div>

      {def.sections.map((section, index) => {
        const id = sectionId(section);
        const state = states[id] ?? { data: {}, baseline: "{}" };
        return (
          <div key={id} className={styles.pair}>
            <section className={cn(styles.editorCard, "space-y-4 p-4 md:p-5")}>
              <header className="space-y-1.5">
                <p className="eyebrow">
                  {def.label} · {index + 1}/{def.sections.length}
                </p>
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <h3 className="font-display text-ink text-lg leading-tight font-bold tracking-[0.02em] uppercase">
                    {section.title}
                  </h3>
                  {section.related && onOpenTab ? (
                    <button
                      type="button"
                      onClick={() => onOpenTab(section.related!.tab)}
                      className={buttonVariants({
                        className: "mt-0.5",
                        size: "sm",
                        variant: "outline",
                      })}
                    >
                      {section.related.label}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <p className="text-mute text-sm leading-relaxed">
                  {section.description}
                </p>
              </header>
              <CopyFields
                idPrefix={`copy-${id}`}
                fields={section.fields}
                value={state.data}
                onChange={(key, next) =>
                  update(section, { ...state.data, [key]: next })
                }
              />
            </section>
            <div className={styles.previewCol}>
              <SectionPreview
                def={section}
                data={state.data}
                support={support}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Full-viewport spinner shown only after a 320ms grace period, so fast
 * loads (cached queries, tab switches) never flash a loading state.
 */
function DelayedLoadingOverlay({ label }: { label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 320);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="bg-paper/75 fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]"
    >
      <Loader2 className="text-ink size-12 animate-spin" aria-hidden="true" />
      <p className="eyebrow">{label}</p>
    </div>
  );
}

function buildStates(
  def: SitePageDef,
  dataMap: Record<string, PageCopyBody> | undefined,
): Record<string, SectionState> {
  const out: Record<string, SectionState> = {};
  for (const section of def.sections) {
    const data = normalizeSectionData(
      section,
      dataMap?.[section.page]?.sections?.[section.section],
    );
    out[sectionId(section)] = { data, baseline: JSON.stringify(data) };
  }
  return out;
}

function previewSupport(
  newsRows: Record<string, unknown>[] | undefined,
  shopRows: Record<string, unknown>[] | undefined,
  copyMap: Record<string, PageCopyBody> | undefined,
): PreviewSupport {
  // Same mapping as the home page: featured first, newest next, max 3.
  const rows = [...(newsRows ?? [])];
  const newsItems: NewsItem[] = rows.length
    ? rows
        .sort(
          (a, b) =>
            Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false),
        )
        .slice(0, 3)
        .map((row) => ({
          body: String(row.excerpt ?? ""),
          kicker: String(row.category ?? ""),
          title: String(row.title ?? ""),
        }))
    : featuredNews.items.map((item) => ({
        body: item.body,
        kicker: item.kicker,
        title: item.title,
      }));

  const shopProducts = (
    shopRows?.length ? (shopRows as unknown as ShopProductRow[]) : shopFallback
  ).map((product) => ({
    ...product,
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
  }));

  const historyIntroRaw =
    copyMap?.history?.sections?.page &&
    typeof (copyMap.history.sections.page as Record<string, unknown>).intro ===
      "string"
      ? ((copyMap.history.sections.page as Record<string, unknown>)
          .intro as string)
      : "";
  const historyIntro = historyIntroRaw || history.intro;

  return { newsItems, shopProducts, historyIntro };
}
