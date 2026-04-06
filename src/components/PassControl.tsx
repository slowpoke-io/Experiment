import { useMemo, useState } from "react";

import { useRouter } from "next/router";

import { buildStudyStagePath } from "@/lib/participant-routing";

type PassStageOption = {
  id: string;
  title: string;
};

type PassControlProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
  currentStageId: string | null;
  stages: PassStageOption[];
};

export function PassControl({
  prolificId,
  sharedQuery,
  currentStageId,
  stages,
}: PassControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orderedStages = useMemo(() => stages, [stages]);

  async function handleJump(targetStageId: string) {
    if (!prolificId || submitting) {
      return;
    }

    if (targetStageId === currentStageId) {
      setOpen(false);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/testing/jump-stage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prolificId,
          targetStageId,
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; targetStageId: string }
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.ok ? "Unable to jump to the selected stage." : payload.message);
      }

      setOpen(false);
      await router.replace(buildStudyStagePath(targetStageId, prolificId, sharedQuery));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to jump stages.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed right-5 top-5 z-40 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="rounded-full border border-slate-300 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur hover:border-slate-950"
      >
        Pass
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close pass panel"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-0 cursor-default"
          />
          <div className="relative z-10 w-[21rem] rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.4)]">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-950">Jump to stage</div>
              <div className="text-sm leading-6 text-slate-700">
                Testing helper. This resets progress from the selected stage onward.
              </div>
            </div>

            <div className="mt-4 max-h-[min(65vh,32rem)] space-y-2 overflow-y-auto pr-1">
              {orderedStages.map((stage, index) => {
                const isCurrent = stage.id === currentStageId;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => void handleJump(stage.id)}
                    disabled={submitting}
                    className={[
                      "w-full rounded-[1.25rem] border px-4 py-3 text-left transition-all disabled:cursor-not-allowed",
                      isCurrent
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
                        Stage {index + 1}
                      </span>
                      {isCurrent ? (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{stage.id}</div>
                    <div
                      className={`mt-1 text-sm leading-6 ${isCurrent ? "text-white/80" : "text-slate-700"}`}
                    >
                      {stage.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {submitting ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-700" />
                <span>Jumping to the selected stage...</span>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
