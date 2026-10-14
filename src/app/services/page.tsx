"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FLOWS, formatINR, type FlowId } from "@/lib/catalog";
import { useCase } from "@/lib/case";
import { Icon } from "@/components/Icons";
import { PageHead, useGuard } from "@/components/Ui";

const ICONS: Record<FlowId, React.ReactNode> = {
  scanner: Icon.scan,
  legal: Icon.chat,
  odr: Icon.scale,
  offline: Icon.building,
};

const FROM: Record<FlowId, string> = {
  scanner: "Free · no forms",
  legal: `from ${formatINR(FLOWS.legal.platformFee)}`,
  odr: `from ${formatINR(FLOWS.odr.platformFee)}`,
  offline: "lawyer fee only",
};

export default function ServicesPage() {
  const router = useRouter();
  const { state, update } = useCase();
  const ok = useGuard(["arrival", "category"]);
  if (!ok) return null;

  const open = (flow: FlowId) => {
    update({ flow, lawyerId: undefined, jurisdictionId: undefined });
    router.push(FLOWS[flow].href);
  };

  return (
    <div className="wrap page">
      <PageHead
        title="How can we help you today?"
        lead={`${state.arrival === "indian" ? "Indian" : "Foreign"} · ${state.category === "oci" ? "OCI holder" : "Tourist"}. Choose a service to continue.`}
      />
      <div className="grid two">
        {(Object.keys(FLOWS) as FlowId[]).map((id) => (
          <button key={id} className="choice" onClick={() => open(id)}>
            <span className="icon">{ICONS[id]}</span>
            <h3>{FLOWS[id].title}</h3>
            <p>{FLOWS[id].tagline}</p>
            <span className="row spread" style={{ marginTop: "auto" }}>
              <span className="pill gold">{FROM[id]}</span>
              <span className="go">Start →</span>
            </span>
          </button>
        ))}
      </div>
      <div className="actions">
        <Link href="/category" className="btn ghost">← Back</Link>
      </div>
    </div>
  );
}
