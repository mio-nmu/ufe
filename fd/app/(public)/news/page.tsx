import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/team/page-hero";
import { Reveal } from "@/components/team/reveal";
import { routes } from "@/config/routes";
import { getNews } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  description: "СЭЗИС-ийн сагсан бөмбөгийн шигшээ багийн мэдээ, зарлал.",
  title: "Мэдээ",
};

const dateFormat = new Intl.DateTimeFormat("mn-MN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ulaanbaatar",
});

/** /news — every published post, newest first, each linking to its article. */
export default async function NewsPage() {
  const posts = await getNews({ limit: 60 });

  return (
    <>
      <PageHero
        breadcrumb="Мэдээ"
        title="Мэдээ"
        subtitle="Багийн мэдээ, тоглолтын тойм, зарлал."
      />
      <section className="team-shell py-12 md:py-16">
        {posts.length === 0 ? (
          <p className="border-line bg-paper-soft text-mute rounded-lg border p-8 text-center">
            Одоогоор нийтэлсэн мэдээ алга.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} as="li" delay={Math.min(index, 6) * 40}>
                <Link
                  href={routes.site.newsPost(post.slug)}
                  className="group team-focus border-line bg-paper card-lift flex h-full flex-col overflow-hidden rounded-lg border"
                >
                  <div className="bg-paper-soft relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={post.coverImage || "/season-welcome.png"}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="eyebrow">
                      {post.category} ·{" "}
                      {dateFormat.format(new Date(post.publishedAt))}
                    </p>
                    <h2 className="font-display text-ink mt-2 text-[22px] leading-[1.1] font-semibold tracking-[0.02em] uppercase">
                      {post.title}
                    </h2>
                    <p className="text-mute mt-2 line-clamp-3 text-[14px] leading-[1.6]">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
