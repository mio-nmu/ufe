import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { routes } from "@/config/routes";
import { getNewsPost } from "@/lib/content";

export const revalidate = 60;

const dateFormat = new Intl.DateTimeFormat("mn-MN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Ulaanbaatar",
});

type Params = { params: Promise<{ slug: string }> };

export default async function NewsPostPage({ params }: Params) {
  const post = await getNewsPost((await params).slug);
  if (!post) notFound();

  return (
    <article className="team-shell py-12 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href={routes.site.news}
          className="team-focus text-mute hover:text-ink inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold tracking-[0.06em] uppercase transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Бүх мэдээ
        </Link>
        <p className="eyebrow mt-6">
          {post.category} · {dateFormat.format(new Date(post.publishedAt))}
        </p>
        <h1 className="font-display text-ink mt-3 text-[clamp(32px,5vw,52px)] leading-[1.02] font-bold tracking-[0.02em] uppercase">
          {post.title}
        </h1>
        <p className="text-mute mt-4 text-[18px] leading-[1.6]">
          {post.excerpt}
        </p>
        {post.coverImage && (
          <div className="bg-paper-soft relative mt-8 aspect-[16/9] overflow-hidden rounded-lg">
            <Image
              src={post.coverImage}
              alt=""
              fill
              priority
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain"
            />
          </div>
        )}
        <div className="text-ink mt-8 space-y-5 text-[17px] leading-[1.75]">
          {paragraphs(post.content).map((text, index) => (
            <p key={index} className="whitespace-pre-line">
              {text}
            </p>
          ))}
        </div>
        {post.tags.length > 0 && (
          <ul className="border-line mt-10 flex flex-wrap gap-2 border-t pt-6">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="border-line text-mute rounded-full border px-3 py-1 text-[13px]"
              >
                #{tag}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** Plain-text article body: blank lines separate paragraphs. */
function paragraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await getNewsPost((await params).slug);
  return post
    ? { description: post.excerpt, title: post.title }
    : { title: "Мэдээ олдсонгүй" };
}
