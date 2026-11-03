import { SiteFooter } from "@/components/team/site-footer";
import { SiteHeader } from "@/components/team/site-header";
import { PageTransition } from "@/components/team/page-transition";
import { contact } from "@/content/site";
import { getContactInfo, getSiteBrand } from "@/lib/content";

/**
 * Editorial shell for the public team site: skip link, sticky header
 * (utility bar + nav), page content with the 240ms rise-in transition
 * between routes, ink footer. Footer contact details come from the
 * site-content contact/info blob over the static default (ISR-cached with
 * the site-content tag, purged on admin saves).
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brandPromise = getSiteBrand();
  const info = await getContactInfo({
    address: contact.address,
    email: contact.email,
    footerPhones: [...contact.footerPhones],
    phones: [...contact.phones],
    slogan: contact.slogan,
    web: contact.web,
    webUrl: contact.webUrl,
  });
  const brand = await brandPromise;

  return (
    <div className="public-site bg-paper text-ink flex min-h-svh flex-col overflow-x-clip font-sans antialiased">
      <a href="#content" className="skip-link">
        Агуулга руу алхах
      </a>
      <SiteHeader logo={brand.logo} siteName={brand.siteName} />
      <main id="content" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter info={info} brand={brand} />
    </div>
  );
}
