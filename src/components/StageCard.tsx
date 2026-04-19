import type { ReactNode } from "react";

import type { StageUI } from "@/lib/types";

type StageCardProps = {
  stageId: string;
  stageIndex: number;
  totalStages: number;
  variant: string;
  iv1: string;
  iv2: string;
  ui: StageUI;
  children: ReactNode;
};

const toneClassMap = {
  amber: "border-amber-300 bg-amber-100/70 text-amber-900",
  teal: "border-teal-300 bg-teal-100/80 text-teal-900",
  rust: "border-orange-300 bg-orange-100/80 text-orange-900",
  indigo: "border-indigo-300 bg-indigo-100/80 text-indigo-900",
  emerald: "border-emerald-300 bg-emerald-100/80 text-emerald-900",
  slate: "border-slate-300 bg-slate-100/80 text-slate-900",
};

export function StageCard({
  stageId,
  stageIndex,
  totalStages,
  variant,
  iv1,
  iv2,
  ui,
  children,
}: StageCardProps) {
  const toneClass = toneClassMap[ui.accent ?? "amber"];
  const showDebugChips = process.env.NODE_ENV !== "production";

  return (
    <article className="panel space-y-6">
      {showDebugChips ? (
        <div className="flex flex-wrap gap-2">
          <span className="chip chip-neutral">
            Stage {stageIndex + 1} / {totalStages}
          </span>
          <span className="chip chip-neutral">Pipeline stage</span>
          <span className={`chip ${toneClass}`}>{stageId}</span>
          <span className="chip chip-neutral">Variant {variant}</span>
          <span className="chip chip-neutral">iv1 {iv1}</span>
          <span className="chip chip-neutral">iv2 {iv2}</span>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950">
          {ui.title}
        </h2>
        {ui.description && (
          <div
            className="body-copy max-w-3xl"
            dangerouslySetInnerHTML={{ __html: ui.description }}
          />
        )}
      </div>

      {children}
    </article>
  );
}
