import { useState } from "react";

import Link from "next/link";

type FollowUpSettings = {
  pipelineCode: string;
  completeCode: string;
  failCode: string;
  noconsentCode: string;
  studyOpen: boolean;
  completeUrl: string;
  failUrl: string;
  noconsentUrl: string;
};

type FollowUpSettingsPageProps = {
  initialSettings: FollowUpSettings;
};

function buildPreviewUrl(code: string) {
  return `https://app.prolific.com/submissions/complete?cc=${encodeURIComponent(code.trim())}`;
}

const FOLLOW_UP_STUDY_PREVIEW_URL =
  "https://ai-workplace-assistant.nblab.im.ntu.edu.tw/?prolific_id={{%PROLIFIC_PID%}}";

export function FollowUpSettingsPage({
  initialSettings,
}: FollowUpSettingsPageProps) {
  const [pipelineCode, setPipelineCode] = useState(initialSettings.pipelineCode);
  const [completeCode, setCompleteCode] = useState(initialSettings.completeCode);
  const [failCode, setFailCode] = useState(initialSettings.failCode);
  const [noconsentCode, setNoconsentCode] = useState(initialSettings.noconsentCode);
  const [studyOpen, setStudyOpen] = useState(initialSettings.studyOpen);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/follow-up/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pipelineCode,
          completeCode,
          failCode,
          noconsentCode,
          studyOpen,
        }),
      });

      const payload = (await response.json()) as
        | { ok: true; settings: FollowUpSettings }
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(
          "message" in payload ? payload.message : "Unable to save settings.",
        );
        setSubmitting(false);
        return;
      }

      setCompleteCode(payload.settings.completeCode);
      setPipelineCode(payload.settings.pipelineCode);
      setFailCode(payload.settings.failCode);
      setNoconsentCode(payload.settings.noconsentCode);
      setStudyOpen(payload.settings.studyOpen);
      setSuccessMessage("Settings saved.");
      setSubmitting(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected save error.",
      );
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch("/api/follow-up/logout", { method: "POST" });
    } finally {
      window.location.assign("/follow-up/login");
    }
  }

  const completePreview = buildPreviewUrl(completeCode);
  const failPreview = buildPreviewUrl(failCode);
  const noconsentPreview = buildPreviewUrl(noconsentCode);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <section className="hero-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="eyebrow">Follow-Up</span>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Settings
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <span
              className={`chip ${studyOpen ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}
            >
              {studyOpen ? "Study Open" : "Study Closed"}
            </span>
            <Link href="/follow-up/results" className="secondary-button">
              Results
            </Link>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Settings
            </h2>
            <p className="body-copy">
              Set the active pipeline code and Prolific completion codes.
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <label
                htmlFor="pipeline-code"
                className="text-sm font-semibold text-slate-700"
              >
                Pipeline code
              </label>
              <input
                id="pipeline-code"
                type="text"
                value={pipelineCode}
                onChange={(event) => setPipelineCode(event.currentTarget.value)}
                className="block w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="complete-code"
                className="text-sm font-semibold text-slate-700"
              >
                Complete code
              </label>
              <input
                id="complete-code"
                type="text"
                value={completeCode}
                onChange={(event) => setCompleteCode(event.currentTarget.value)}
                className="block w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="fail-code"
                className="text-sm font-semibold text-slate-700"
              >
                Fail code
              </label>
              <input
                id="fail-code"
                type="text"
                value={failCode}
                onChange={(event) => setFailCode(event.currentTarget.value)}
                className="block w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="noconsent-code"
                className="text-sm font-semibold text-slate-700"
              >
                No-consent code
              </label>
              <input
                id="noconsent-code"
                type="text"
                value={noconsentCode}
                onChange={(event) => setNoconsentCode(event.currentTarget.value)}
                className="block w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70"
                disabled={submitting}
              />
            </div>

            <label className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <input
                type="checkbox"
                checked={studyOpen}
                onChange={(event) => setStudyOpen(event.currentTarget.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950"
                disabled={submitting}
              />
              <span className="space-y-1">
                <span className="block text-sm font-semibold text-slate-900">
                  Study open
                </span>
                <span className="block text-sm text-slate-600">
                  When closed, new participants cannot start the study.
                </span>
              </span>
            </label>

            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                submitting ||
                pipelineCode.trim().length === 0 ||
                completeCode.trim().length === 0 ||
                failCode.trim().length === 0 ||
                noconsentCode.trim().length === 0
              }
              className="primary-button"
            >
              {submitting ? "Saving..." : "Save settings"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Redirect Preview
            </h2>
            <p className="body-copy">
              These are the exact Prolific redirect URLs generated from the
              stored codes.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="hero-metric-label">Study URL</div>
              <div className="hero-metric-value">{FOLLOW_UP_STUDY_PREVIEW_URL}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="hero-metric-label">Pipeline</div>
              <div className="hero-metric-value">{pipelineCode}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="hero-metric-label">Complete</div>
              <div className="hero-metric-value">{completePreview}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="hero-metric-label">Fail</div>
              <div className="hero-metric-value">{failPreview}</div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="hero-metric-label">No Consent</div>
              <div className="hero-metric-value">{noconsentPreview}</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
