import type { Metadata } from "next";
import Link from "next/link";
import { getJournal } from "@/lib/catalog";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  const [lead, ...rest] = getJournal();
  return (
    <div className="container-x pt-12 md:pt-16">
      <h1 className="t-h1">Journal</h1>
      {lead && (
        <Link href={`/journal/${lead.slug}`} className="group mt-16 block border-t border-ink pt-10">
          <p className="t-meta text-muted">{formatDate(lead.date)} · {lead.readingMinutes} min read</p>
          <h2 className="t-hero mt-6 max-w-4xl text-[clamp(2.25rem,5vw,4rem)] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-8">{lead.title}</h2>
          <p className="mt-6 max-w-xl text-[17px] text-charcoal">{lead.excerpt}</p>
        </Link>
      )}
      <ul className="mt-24 grid gap-12 md:grid-cols-2">
        {rest.map((j) => (
          <li key={j.slug} className="border-t border-line pt-8">
            <Link href={`/journal/${j.slug}`} className="group block">
              <p className="t-meta text-muted">{formatDate(j.date)} · {j.readingMinutes} min read</p>
              <h2 className="mt-4 text-[26px] font-medium leading-tight tracking-[-0.02em] group-hover:underline group-hover:underline-offset-4">{j.title}</h2>
              <p className="mt-3 text-muted">{j.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
