import type {
  InteractiveChatConfig,
  InteractiveChatMessage,
  InteractiveStatusStep,
} from "@/lib/types";

type AIWorkplaceChatProps = {
  chat: InteractiveChatConfig;
};

function BotIcon({ stroke = "#2563eb" }: { stroke?: string }) {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="1.1" fill={stroke} stroke="none" />
      <circle cx="15" cy="11" r="1.1" fill={stroke} stroke="none" />
      <path d="M9 14.5c.9 1 5.1 1 6 0" strokeLinecap="round" />
      <path d="M12 4V2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      stroke="#16a34a"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ErrorIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      stroke="#dc2626"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r="0.6" fill="#dc2626" />
    </svg>
  );
}

function StatusBubble({ steps }: { steps: InteractiveStatusStep[] }) {
  return (
    <div className="min-w-[19rem] rounded-[1.15rem] rounded-tl-md border border-indigo-100 bg-white px-4 py-4 shadow-sm">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(29,78,216)]">
        Process
      </div>
      <div className="space-y-3">
        {steps.map((step) => {
          const isError = Boolean(step.isError);

          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="flex w-4 justify-center">
                {isError ? <ErrorIcon /> : <CheckIcon />}
              </span>
              <span
                className={`text-sm ${
                  isError ? "font-medium text-red-700" : "text-emerald-700"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: InteractiveChatMessage }) {
  if (message.type === "statusBubble") {
    return (
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#dbeafe]">
          <BotIcon />
        </div>
        <StatusBubble steps={message.statusSteps} />
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] rounded-[1.15rem] rounded-tr-md bg-[#2563eb] px-4 py-3 text-[15px] leading-6 text-white shadow-sm">
          {message.text}
        </div>
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
          You
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#dbeafe]">
        <BotIcon />
      </div>
      <div
        className={`max-w-[80%] rounded-[1.15rem] rounded-tl-md border px-4 py-3 text-[15px] leading-6 shadow-sm ${
          message.isError
            ? "border-red-200 bg-red-50 text-red-950"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        {message.isError ? (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-700">
            <ErrorIcon size={12} />
            <span>System error</span>
          </div>
        ) : null}
        <div
          className="chat-html"
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
      </div>
    </div>
  );
}

export function AIWorkplaceChat({ chat }: AIWorkplaceChatProps) {
  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(37,99,235)] shadow-sm">
            <BotIcon stroke="#dbeafe" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-slate-950">
              {chat.headerTitle}
            </div>
            {/* <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>{chat.headerStatus}</span>
            </div> */}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/80 px-4 py-5 sm:px-6">
        <div className="space-y-4">
          {chat.messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex min-h-12 flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-400">
            {chat.composerPlaceholder}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
            <SendIcon />
          </div>
        </div>
      </div>

      <style jsx global>{`
        .chat-html p {
          margin-bottom: 0.45rem;
        }

        .chat-html p:last-child {
          margin-bottom: 0;
        }

        .chat-html ul,
        .chat-html ol {
          margin: 0.35rem 0 0.5rem 1.25rem;
        }

        .chat-html ul {
          list-style-type: disc;
        }

        .chat-html ol {
          list-style-type: decimal;
        }

        .chat-html li {
          margin-bottom: 0.2rem;
        }

        .chat-html ul ul {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          list-style-type: circle;
        }

        .chat-html strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
