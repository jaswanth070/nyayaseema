import Link from "next/link";

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M5 33C5 18 14 9 28 7" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M34.5 6.5c1.4 1.4-.2 4-2.4 6.1l-3.2 3.1 2.3 9.6-2.3 1.4-5-7.3-4 3.9.4 3.5-1.9 1.3-2-4.6-4.6-2 1.4-1.9 3.6.4 3.9-4-7.3-5 1.4-2.3 9.6 2.3 3.1-3.2c2.1-2.2 4.7-3.8 6-2.4Z"
        fill="#ebddc1"
        transform="translate(1 1) scale(.92)"
      />
    </svg>
  );
}

export function Header() {
  return (
    <header className="topbar">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="NyayaSeema home">
          <Logo />
          <span>
            <span className="brand-name">NyayaSeema</span>
            <span className="brand-sub">Customs Shield Pass</span>
          </span>
        </Link>
        <nav aria-label="Primary">
          <Link href="/arrival" className="hide-sm">Arrivals</Link>
          <span className="poc-chip">POC</span>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span>
          <strong>NyayaSeema</strong> — Shop Globally. Clear Locally. Travel Stress-free.
        </span>
        <span>Proof of concept. Sample lawyers and illustrative duty rates; not legal advice.</span>
      </div>
    </footer>
  );
}
