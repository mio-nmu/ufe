import Image from "next/image";

import { siteConfig } from "@/config/site";
import type { SiteBrand } from "@/lib/content";
import type { ContactInfo } from "@/types/content";

/**
 * Minimal ink footer: brand mark, a one-line contact row, social links and
 * the copyright strip. No internal page links — the header owns navigation.
 * Contact details come from «Холбоо барих» (site-content contact/info); the
 * logo, name and social links from «Ерөнхий мэдээлэл» (general/*).
 */
export function SiteFooter({
  info,
  brand,
}: {
  info: ContactInfo;
  brand: SiteBrand;
}) {
  const socials = [
    { href: brand.facebook, label: "Facebook" },
    { href: brand.instagram, label: "Instagram" },
  ].filter((item): item is { href: string; label: string } =>
    Boolean(item.href),
  );

  return (
    <footer className="bg-ink text-white">
      <div className="team-shell space-y-5 py-12 md:py-16">
        <div className="flex items-center gap-2.5">
          <Image
            src={brand.logo ?? "/ufe-logo.png"}
            alt=""
            width={32}
            height={32}
            className="size-8 object-contain"
          />
          <p className="font-display text-sm font-bold tracking-[0.06em] uppercase">
            {brand.siteName ?? siteConfig.shortName}
          </p>
        </div>

        <ul className="flex flex-col gap-1.5 text-[13px] text-white/70 sm:flex-row sm:flex-wrap sm:gap-x-6">
          <li>{info.address}</li>
          <li>{info.footerPhones.join(", ")}</li>
          <li>
            <a
              href={`mailto:${info.email}`}
              className="team-focus transition-colors [--focus-ring:#fff] hover:text-white"
            >
              {info.email}
            </a>
          </li>
          <li>
            <a
              href={info.webUrl}
              target="_blank"
              rel="noreferrer"
              className="team-focus transition-colors [--focus-ring:#fff] hover:text-white"
            >
              {info.web}
            </a>
          </li>
        </ul>

        {socials.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {socials.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="team-focus inline-flex min-h-9 items-center rounded-full border border-white/30 px-4 text-[13px] font-semibold text-white transition-colors [--focus-ring:#fff] hover:border-white hover:bg-white/10"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-white/10">
        <div className="team-shell flex flex-col items-start justify-between gap-1 py-4 text-[12px] tracking-[0.06em] text-white/60 uppercase sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {brand.siteName ?? siteConfig.fullName}
          </p>
          <p>{siteConfig.university}</p>
        </div>
      </div>
    </footer>
  );
}
