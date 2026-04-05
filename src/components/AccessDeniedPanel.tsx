type AccessDeniedPanelProps = {
  title?: string;
  description?: string;
};

export function AccessDeniedPanel({
  title = "Study unavailable",
  description = "A valid `prolific_id` query parameter is required to access this study. Please reopen the study from the Prolific task link.",
}: AccessDeniedPanelProps) {
  return (
    <div className="panel">
      <span className="eyebrow">Access required</span>
      <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="body-copy mt-3">{description}</p>
    </div>
  );
}
