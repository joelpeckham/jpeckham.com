"use client";

import { useMemo, useState } from "react";
import {
  Chip,
  DemoShell,
  OutcomeBanner,
  Panel,
  controlSelect,
} from "@/components/interactive/quantum-shared";
import { cn } from "@/lib/utils";
import {
  CODES,
  computeSyndrome,
  formatError,
  formatPauliString,
  lookupError,
  type CodeId,
  type QubitError,
} from "./model";

const CODE_OPTIONS: { id: CodeId; label: string }[] = [
  { id: "five", label: "5-Qbit (Mermin 5.5)" },
  { id: "steane", label: "7-Qbit Steane (5.6)" },
];

const ERROR_KINDS = ["none", "X", "Y", "Z"] as const;

function buildError(kind: (typeof ERROR_KINDS)[number], qubit: number): QubitError {
  if (kind === "none") return { kind: "none" };
  return { kind, qubit };
}

function SyndromeLight({ sign }: { sign: 1 | -1 }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center border-2 border-ink font-mono text-xs font-bold tabular-nums",
        sign === 1 ? "bg-blue text-white" : "bg-red text-white",
      )}
      aria-label={sign === 1 ? "commutes, +1" : "anticommutes, −1"}
    >
      {sign === 1 ? "+1" : "−1"}
    </span>
  );
}

export function StabilizerChecklistDemo() {
  const [codeId, setCodeId] = useState<CodeId>("steane");
  const [errorKind, setErrorKind] = useState<(typeof ERROR_KINDS)[number]>("X");
  const [qubit, setQubit] = useState(0);

  const code = CODES[codeId];
  const error = useMemo(
    () => buildError(errorKind, qubit),
    [errorKind, qubit],
  );

  const syndrome = useMemo(
    () => computeSyndrome(error, code.stabilizers),
    [error, code.stabilizers],
  );

  const lookup = useMemo(() => lookupError(syndrome, codeId), [syndrome, codeId]);

  const outcome = useMemo(() => {
    if (lookup.status === "none") {
      return {
        tone: "ok" as const,
        title: "Syndrome: all +1",
        detail: "No anticommutation — codeword is uncorrupted (or error outside this toy set).",
      };
    }
    if (lookup.status === "match") {
      return {
        tone: "ok" as const,
        title: `Points to ${formatError(lookup.error)}`,
        detail: "Apply the inverse Pauli on that qubit to restore the logical state.",
      };
    }
    if (lookup.status === "ambiguous") {
      return {
        tone: "warn" as const,
        title: "Ambiguous syndrome",
        detail: lookup.candidates.map(formatError).join(", "),
      };
    }
    return {
      tone: "bad" as const,
      title: "Unknown syndrome",
      detail: "Pattern not in the single-qubit error lookup table.",
    };
  }, [lookup]);

  return (
    <DemoShell
      title="Stabilizer syndrome checklist"
      blurb="Pick a code and a single-qubit Pauli (X bit-flip, Z phase-flip, Y both). Each stabilizer returns +1 if it commutes with the error, −1 if it anticommutes — that ±1 list is the syndrome."
      accent="blue"
    >
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 font-mono text-xs">
          <span className="uppercase tracking-[0.1em] text-grey">Code</span>
          <select
            className={controlSelect}
            value={codeId}
            onChange={(e) => {
              const next = e.target.value as CodeId;
              setCodeId(next);
              setQubit(0);
            }}
          >
            {CODE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-mono text-xs">
          <span className="uppercase tracking-[0.1em] text-grey">Error</span>
          <select
            className={controlSelect}
            value={errorKind}
            onChange={(e) =>
              setErrorKind(e.target.value as (typeof ERROR_KINDS)[number])
            }
          >
            {ERROR_KINDS.map((k) => (
              <option key={k} value={k}>
                {k === "none" ? "None (I)" : k}
              </option>
            ))}
          </select>
        </label>

        {errorKind !== "none" ? (
          <label className="flex flex-col gap-1 font-mono text-xs">
            <span className="uppercase tracking-[0.1em] text-grey">Qubit</span>
            <select
              className={controlSelect}
              value={qubit}
              onChange={(e) => setQubit(Number(e.target.value))}
            >
              {Array.from({ length: code.n }, (_, i) => (
                <option key={i} value={i}>
                  q{i}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <Panel label="Injected error">
        <Chip tone={errorKind === "none" ? "ok" : "warn"}>
          {formatError(error)}
        </Chip>
      </Panel>

      <Panel label="Stabilizer checklist">
        <ul className="space-y-2">
          {code.stabilizers.map((stab, i) => (
            <li
              key={stab.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 py-1.5 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="font-mono text-sm font-bold">{stab.label}</span>
                <span className="ml-2 font-mono text-xs text-grey">
                  {stab.product}
                </span>
                <span className="ml-1 hidden font-mono text-[10px] text-grey sm:inline">
                  ({formatPauliString(stab.ops)})
                </span>
              </div>
              <SyndromeLight sign={syndrome[i]!} />
            </li>
          ))}
        </ul>
      </Panel>

      <OutcomeBanner tone={outcome.tone} title={outcome.title} detail={outcome.detail} />
    </DemoShell>
  );
}
