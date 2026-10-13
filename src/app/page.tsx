import Link from "next/link";
import { FLOWS } from "@/lib/catalog";
import { Icon } from "@/components/Icons";

export default function Home() {
  return (
    <>
      <section className="hero">
        <img className="hero-airport" src="/brand/airport.webp" alt="" />
        <img className="hero-plane" src="/brand/plane.webp" alt="" />
        <div className="wrap">
          <p className="kicker">Pre-Purchase Shopping Intelligence</p>
          <h1>NyayaSeema</h1>
          <p className="tag">&ldquo;Shop Globally. Clear Locally. Travel Stress-free&rdquo;</p>
          <div className="cta">
            <Link href="/arrival" className="btn gold lg">Start arrival declaration</Link>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="page">
          <div className="eyebrow">How it works</div>
          <h2 className="page-title" style={{ fontSize: "1.9rem" }}>
            From overseas shopping to a 5-second exit
          </h2>
          <hr className="rule" />
          <div className="grid four">
            {(["scanner", "legal", "odr", "offline"] as const).map((id, i) => (
              <div key={id} className="card blue stack" style={{ gap: 10 }}>
                <div className="icon-box">
                  {[Icon.scan, Icon.chat, Icon.scale, Icon.building][i]}
                </div>
                <h3>{FLOWS[id].title}</h3>
                <p className="muted small">{FLOWS[id].tagline}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
