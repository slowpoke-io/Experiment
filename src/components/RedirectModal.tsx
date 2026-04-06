type RedirectModalProps = {
  open: boolean;
  title: string;
  description: string;
  buttonLabel: string;
  note?: string;
  tone?: "success" | "warning";
  onConfirm: () => void;
};

const toneClassMap = {
  success: {
    accent: "border-emerald-200 bg-emerald-50 text-emerald-900",
    iconWrap: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "M5 12.5 9.2 16.5 19 7.5",
  },
  warning: {
    accent: "border-amber-200 bg-amber-50 text-amber-900",
    iconWrap: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "M12 7v5m0 4h.01",
  },
};

export function RedirectModal({
  open,
  title,
  description,
  buttonLabel,
  note,
  tone = "success",
  onConfirm,
}: RedirectModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-xl space-y-6">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${toneClassMap[tone].iconWrap}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={toneClassMap[tone].icon} />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
            </div>
            <p className="body-copy">{description}</p>
          </div>
          {note ? (
            <div
              className={`rounded-[1.5rem] border px-4 py-3 text-sm leading-6 ${toneClassMap[tone].accent}`}
            >
              {note}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end">
          <button
            className="primary-button w-full sm:w-auto"
            type="button"
            onClick={onConfirm}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
