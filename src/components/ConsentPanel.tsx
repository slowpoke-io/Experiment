import { useState } from "react";
import { useRouter } from "next/router";

import { AccessDeniedPanel } from "@/components/AccessDeniedPanel";
import { PIPELINE } from "@/lib/pipeline";
import {
  buildConsentSessionKey,
  buildStudyPath,
} from "@/lib/participant-routing";

type ConsentPanelProps = {
  prolificId: string | null;
  sharedQuery: Record<string, string>;
};

export function ConsentPanel({ prolificId, sharedQuery }: ConsentPanelProps) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!prolificId) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <AccessDeniedPanel />
      </div>
    );
  }

  async function handleAgree() {
    const participantId = prolificId;
    if (!participantId) {
      return;
    }

    window.sessionStorage.setItem(
      buildConsentSessionKey(participantId, PIPELINE.code),
      "true",
    );

    await router.push(buildStudyPath(participantId, sharedQuery));
  }

  async function handleDecline() {
    setDeclining(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/decline-url");
      const payload = (await response.json()) as
        | { ok: true; redirectUrl: string }
        | { ok: false; message: string };

      if (payload.ok && payload.redirectUrl) {
        window.location.href = payload.redirectUrl;
        return;
      }

      setDeclining(false);
      setErrorMessage("Unable to load the Prolific return URL.");
    } catch {
      setDeclining(false);
      setErrorMessage("Unable to load the Prolific return URL.");
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <div className="panel mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-3">
          <span className="eyebrow">Informed consent</span>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            Please read the following carefully before proceeding.
          </h2>
        </div>

        <div className="body-copy-compact space-y-5">
          <section>
            <h2 className="mb-1 font-semibold text-slate-900">
              Purpose of the Study
            </h2>
            <p>
              You are invited to participate in a research study examining how
              people perceive and interpret information. The study will take
              approximately <strong>10–15 minutes</strong> to complete.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900">
              What You Will Be Asked to Do
            </h2>
            <p>
              You will complete a series of tasks and questionnaires. Please
              read each item carefully and respond as accurately as possible.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900">
              Risks and Benefits
            </h2>
            <p>
              There are no known risks associated with participation beyond
              those of everyday life. Your participation contributes to
              scientific knowledge about human cognition and behavior.
            </p>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900">
              Confidentiality
            </h2>
            <p>
              Your responses are anonymous. Data will be stored securely and
              used for research purposes only. No personally identifying
              information will be collected beyond your Prolific ID, which is
              used solely to process your payment.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              Data Quality &amp; Performance Requirements
            </h2>
            <div className="mb-3 space-y-1">
              <p>
                This task requires a <strong>high level of engagement</strong>.
              </p>
              <p>
                You will be automatically redirected to Prolific to{" "}
                <strong>return your slot without compensation</strong> if any of
                the following occur:
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  </svg>
                </div>
                <div className="">
                  <h3 className="text-lg font-semibold text-slate-950">
                    Performance and attention requirements
                  </h3>
                  <p className="body-copy-compact">
                    Low-quality or incomplete participation will be returned to
                    Prolific without compensation.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>
                    You fail any of the{" "}
                    <strong>internal attention check</strong> items.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>
                    The study is completed in less than{" "}
                    <strong>5 minutes</strong> or more than
                    <strong>30 minutes</strong>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-500" />
                  <span>
                    Any session is left inactive for more than{" "}
                    <strong>20 minutes</strong> minutes.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-1 font-semibold text-slate-900">
              Voluntary Participation
            </h2>
            <p>
              Participation is entirely voluntary. You may withdraw at any time
              by closing this window, though you will not receive compensation
              if you do not complete the study.
            </p>
          </section>

          <div className="body-copy-compact rounded-xl border border-slate-200 bg-slate-50 p-4">
            By clicking <strong>&quot;I Agree&quot;</strong> below, you confirm
            that you have read and understood the information above, including
            the performance, attention, and session timeout requirements. You
            verify that you are at least 18 years old and voluntarily agree to
            participate in this study under these conditions.
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3  px-6 py-5 sm:flex-row sm:justify-end sm:rounded-[1.5rem]">
          <button
            type="button"
            onClick={() => void handleDecline()}
            disabled={declining}
            className="secondary-button w-full rounded-xl sm:w-auto"
          >
            {declining ? "Redirecting..." : "I Do Not Agree"}
          </button>
          <button
            type="button"
            onClick={() => void handleAgree()}
            className="primary-button w-full rounded-xl sm:w-auto"
          >
            I Agree →
          </button>
        </div>
      </div>
    </div>
  );
}
