import { ContentStage } from "@/components/ContentStage";
import { InteractivePlaceholderStage } from "@/components/InteractivePlaceholderStage";
import { LikertSurveyStage } from "@/components/LikertSurveyStage";
import { VideoStage } from "@/components/VideoStage";
import type { StageResponse } from "@/lib/types";

type StageRendererProps = {
  data: StageResponse;
  disabled: boolean;
  errorMessage: string | null;
  onSubmit: (answers: Record<string, unknown>) => Promise<boolean>;
};

export function StageRenderer({
  data,
  disabled,
  errorMessage,
  onSubmit,
}: StageRendererProps) {
  const ui = data.stage.ui;

  if (!ui) {
    return (
      <div className="panel">
        <h2 className="text-2xl font-semibold text-slate-950">
          Stage configuration missing
        </h2>
        <p className="body-copy mt-3">
          The current stage does not define a UI configuration for variant{" "}
          <strong>{data.stage.variant}</strong>.
        </p>
      </div>
    );
  }

  if (ui.kind === "content") {
    return (
      <ContentStage
        key={`${data.stage.id}:${data.stage.variant}`}
        data={data}
        ui={ui}
        disabled={disabled}
        errorMessage={errorMessage}
        onSubmit={onSubmit}
      />
    );
  }

  if (ui.kind === "video") {
    return (
      <VideoStage
        key={`${data.stage.id}:${data.stage.variant}`}
        data={data}
        ui={ui}
        disabled={disabled}
        errorMessage={errorMessage}
        onSubmit={onSubmit}
      />
    );
  }

  if (ui.kind === "interactive") {
    return (
      <InteractivePlaceholderStage
        key={`${data.stage.id}:${data.stage.variant}`}
        data={data}
        ui={ui}
        disabled={disabled}
        errorMessage={errorMessage}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <LikertSurveyStage
      key={`${data.stage.id}:${data.stage.variant}`}
      data={data}
      ui={ui}
      disabled={disabled}
      errorMessage={errorMessage}
      onSubmit={onSubmit}
    />
  );
}
