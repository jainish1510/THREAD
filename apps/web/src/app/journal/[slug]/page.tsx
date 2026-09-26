import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournal, getJournalEntry } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return getJournal().map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const j = getJournalEntry((await params).slug);
  return j ? { title: j.title, description: j.excerpt } : {};
}

export default async function JournalEntryPage({ params }: PageProps<"/journal/[slug]">) {
  const j = getJournalEntry((await params).slug);
  if (!j) notFound();
  return (
    <article className="container-x max-w-[760px] pt-12 md:pt-20">
      <Link href="/journal" className="t-meta text-muted hover:text-ink">← Journal</Link>
      <p className="t-meta mt-12 text-muted">{formatDate(j.date)} · {j.readingMinutes} min read</p>
      <h1 className="t-h1 mt-6">{j.title}</h1>
      <p className="t-serif mt-8 text-[24px] italic leading-snug text-charcoal">{j.excerpt}</p>
      <div className="mt-12 space-y-6 border-t border-line pt-12 text-[17px] leading-[1.75]">
        {j.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}
