import { useState } from "react";

import dynamic from "next/dynamic";

import { StageCard } from "@/components/StageCard";
import type { StageResponse, VideoStageUI } from "@/lib/types";

const ClientReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-200">
      Loading video player...
    </div>
  ),
});

type VideoStageProps = {
  data: StageResponse;
  ui: VideoStageUI;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

export function VideoStage({
  data,
  ui,
  disabled,
  errorMessage,
  onSubmit,
}: VideoStageProps) {
  const [hasEnded, setHasEnded] = useState(false);

  return (
    <StageCard
      stageId={data.stage.id}
      stageIndex={data.stage.index}
      totalStages={data.stage.total}
      variant={data.stage.variant}
      iv1={data.iv1}
      iv2={data.iv2}
      ui={ui}
    >
      {ui.introTitle ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-xl font-semibold text-slate-950">
            {ui.introTitle}
          </h3>
          <div className="body-copy mt-4 space-y-3">
            {ui.instructions.map((instruction) => (
              <p key={instruction}>{instruction}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-sm">
        <div className="aspect-video">
          <ClientReactPlayer
            src={ui.videoUrl}
            controls
            width="100%"
            height="100%"
            playing={false}
            onEnded={() => setHasEnded(true)}
          />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="body-copy-compact">
            {hasEnded ? (
              <span className="font-semibold text-emerald-600">
                Video playback finished. You may continue.
              </span>
            ) : (
              <span>{ui.completionMessage}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onSubmit({ videoCompleted: true })}
            disabled={!hasEnded || disabled}
            className="primary-button w-full sm:w-auto"
          >
            {disabled ? "Submitting..." : ui.submitLabel ?? "Continue"}
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </StageCard>
  );
}
