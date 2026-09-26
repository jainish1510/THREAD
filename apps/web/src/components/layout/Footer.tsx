import Link from "next/link";

const groups = [
  { title: "Shop", links: [["All clothing", "/shop"], ["Collections", "/collections"], ["Search", "/search"], ["Find your size", "/fit"]] },
  { title: "Transparency", links: [["Materials", "/materials"], ["Factories", "/factories"], ["Supply chain", "/supply-chain"], ["Journal", "/journal"]] },
  { title: "Help", links: [["Your account", "/account"], ["Track an order", "/account/orders"], ["Bag", "/bag"]] },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="container-x grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="text-[17px] font-semibold tracking-[0.28em]">THREAD</p>
          <p className="mt-4 max-w-xs text-[13px] text-muted">
            Better materials. Better factories. Fewer, better pieces — with the costs, the people and the places published for every one.
          </p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <p className="t-meta text-muted">{g.title}</p>
            <ul className="mt-4 space-y-2 text-[13px]">
              {g.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href!} className="link-reveal">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-x flex flex-col gap-2 border-t border-line py-6 text-[11px] text-muted md:flex-row md:justify-between">
        <p>© 2026 THREAD. A fictional brand — all product, cost, factory and audit data is simulated.</p>
        <p>Prices in USD</p>
      </div>
    </footer>
  );
}
