"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCase, type Category } from "@/lib/case";
import { Icon } from "@/components/Icons";
import { PageHead, useGuard } from "@/components/Ui";

export default function CategoryPage() {
  const router = useRouter();
  const { state, update } = useCase();
  const ok = useGuard(["arrival"]);
  if (!ok) return null;

  const pick = (category: Category) => {
    update({ category });
    router.push("/services");
  };

  return (
    <div className="wrap page">
      <PageHead
        title="Select Your Passenger Category"
        lead={`Arrival type: ${state.arrival === "indian" ? "Indian" : "Foreign"}. Choose the category that matches your travel document.`}
      />
      <div className="grid two">
        <button className={`choice${state.category === "tourist" ? " selected" : ""}`} onClick={() => pick("tourist")}>
          <span className="icon">{Icon.suitcase}</span>
          <h3>Tourist</h3>
          <p>Visiting or returning from a short trip with personal baggage.</p>
          <span className="go">Continue →</span>
        </button>
        <button className={`choice${state.category === "oci" ? " selected" : ""}`} onClick={() => pick("oci")}>
          <span className="icon">{Icon.user}</span>
          <h3>OCI Holder</h3>
          <p>Overseas Citizen of India cardholder.</p>
          <span className="go">Continue →</span>
        </button>
      </div>
      <div className="actions">
        <Link href="/arrival" className="btn ghost">← Back</Link>
      </div>
    </div>
  );
}
