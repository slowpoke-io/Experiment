import { useState } from "react";

type FollowUpLoginPanelProps = {
  onSuccess: () => void;
};

export function FollowUpLoginPanel({ onSuccess }: FollowUpLoginPanelProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/follow-up/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as
        | { ok: true }
        | { ok: false; message: string };

      if (!response.ok || !payload.ok) {
        setErrorMessage(
          "message" in payload ? payload.message : "Unable to sign in.",
        );
        setSubmitting(false);
        return;
      }

      onSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected login error.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col justify-center px-5 py-6 sm:px-8 lg:px-10">
      <div className="panel mx-auto w-full max-w-md">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Login
          </h1>
          <p className="body-copy">Enter the password to continue.</p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <label
              htmlFor="follow-up-password"
              className="text-sm font-semibold text-slate-700"
            >
              Password
            </label>
            <input
              id="follow-up-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              className="block w-full rounded-[1.5rem] border border-slate-300 bg-white px-5 py-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-amber-200/70"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || password.trim().length === 0}
            className="primary-button w-full"
          >
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
