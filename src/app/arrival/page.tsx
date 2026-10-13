"use client";

import { useRouter } from "next/navigation";
import { useCase, type Arrival } from "@/lib/case";
import { Icon } from "@/components/Icons";
import { PageHead } from "@/components/Ui";

export default function ArrivalPage() {
  const router = useRouter();
  const { state, update } = useCase();

  const pick = (arrival: Arrival) => {
    update({ arrival, category: undefined, flow: undefined });
    router.push("/category");
  };

  return (
    <div className="wrap page">
      <PageHead
        title="Who is arriving?"
        lead="Tell us who you are so we can apply the right baggage allowances and documentation."
      />
      <div className="grid two">
        <button className={`choice${state.arrival === "indian" ? " selected" : ""}`} onClick={() => pick("indian")}>
          <span className="icon">{Icon.passport}</span>
          <h3>Indian</h3>
          <p>Indian citizen arriving at an Indian international airport.</p>
          <span className="go">Continue →</span>
        </button>
        <button className={`choice${state.arrival === "foreign" ? " selected" : ""}`} onClick={() => pick("foreign")}>
          <span className="icon">{Icon.globe}</span>
          <h3>Foreign</h3>
          <p>Foreign national arriving in India.</p>
          <span className="go">Continue →</span>
        </button>
      </div>
    </div>
  );
}
