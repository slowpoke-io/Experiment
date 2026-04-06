import type { ReactNode } from "react";

type StageInstructionsProps = {
  title: string;
  instructions: string[];
  tone?: "slate" | "indigo";
  children?: ReactNode;
};

const toneClassMap = {
  slate: "border-slate-200 bg-slate-50",
  indigo: "border-indigo-100 bg-indigo-50/70",
};

export function StageInstructions({
  title,
  instructions,
  tone = "slate",
  children,
}: StageInstructionsProps) {
  return (
    <div className={`rounded-[1.75rem] p-6 ${toneClassMap[tone]}`}>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      {instructions.length > 0 ? (
        <ul className="body-copy mt-4 space-y-3">
          {instructions.map((instruction, index) => (
            <li
              key={`${index}:${instruction.slice(0, 32)}`}
              className="flex gap-3"
            >
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-500" />
              <div
                className="min-w-0 flex-1"
                dangerouslySetInnerHTML={{ __html: instruction }}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
