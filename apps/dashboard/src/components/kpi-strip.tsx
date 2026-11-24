import Counter from "@/components/Counter";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import type { RunView } from "@/lib/useRun";
import { cn } from "@/lib/utils";

/** A numbering-machine figure: rolling digits in mono, like the serials on a cheque book. */
function Figure({
  value,
  tone,
  suffix,
}: {
  value: number | null;
  tone: string;
  suffix?: string;
}) {
  if (value === null)
    return (
      <span className="font-display text-[34px] leading-none text-kv-faint/70">
        –
      </span>
    );
  return (
    <Counter
      value={value}
      fontSize={34}
      fontWeight={700}
      textColor={tone}
      suffix={
        suffix ? (
          <span
            style={{ fontSize: 18, color: "var(--kv-faint)", marginLeft: 2 }}
          >
            {suffix}
          </span>
        ) : undefined
      }
      className="font-mono"
      tabular
    />
  );
}

/** The teller's counter: breach rate, utility against its 90% floor, exploits caught, calls blocked. */
export function KpiStrip({ run }: { run: RunView }) {
  const rounds = Object.values(run.rounds).sort((a, b) => a.round - b.round);
  const breach = run.chart[run.currentRound]?.breach ?? null;
  const utilityRound = [...rounds]
    .reverse()
    .find((r) => r.utility_applied != null);
  const utility =
    run.final?.final_utility ?? utilityRound?.utility_applied ?? null;
  const caught = run.toolCards.filter((c) => c.verdict === "breach").length;
  const blocked = run.toolCards.filter((c) => c.verdict === "blocked").length;
  const tth = rounds.find((r) => r.tth_seconds != null)?.tth_seconds ?? null;
  const any = run.toolCards.length > 0;

  return (
    <div className="relative grid grid-cols-2 content-center overflow-hidden rounded-xl border border-kv-border-strong/70 bg-kv-surface shadow-[0_18px_40px_-28px_rgb(14_35_28/0.45)] sm:grid-cols-[1fr_1.15fr_1fr_1fr]">
      <div className="px-4 py-3">
        <p className="truncate text-[12.5px] text-kv-muted">
          Breach rate, round {run.currentRound || 1}
        </p>
        <div className="mt-1 h-10">
          <Figure
            value={breach === null ? null : Math.round(breach * 100)}
            tone={breach ? "var(--kv-attack)" : "var(--kv-text)"}
            suffix="%"
          />
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-kv-faint">
          {rounds.length > 1
            ? rounds
                .map((r) => `${Math.round(r.breach_rate * 100)}%`)
                .join(" → ")
            : "attacks that landed"}
        </p>
      </div>
      <div className="order-first col-span-2 flex items-center gap-3 border-b border-kv-border px-4 py-3 sm:order-none sm:col-span-1 sm:border-b-0 sm:border-l">
        {utility === null ? (
          <div className="grid size-16 shrink-0 place-items-center rounded-full border-[6px] border-dashed border-kv-border font-mono text-kv-faint sm:size-[72px]">
            –
          </div>
        ) : (
          <AnimatedCircularProgressBar
            value={Math.round(utility * 100)}
            gaugePrimaryColor={
              utility < 0.9 ? "var(--kv-attack)" : "var(--kv-secure)"
            }
            gaugeSecondaryColor="rgb(14 35 28 / 0.08)"
            className="size-16 shrink-0 font-mono text-[14px] text-kv-text sm:size-[72px] sm:text-[15px]"
          />
        )}
        <div className="min-w-0">
          <p className="text-[12.5px] text-kv-muted">Utility</p>
          <p
            className={cn(
              "font-display text-[18px] leading-tight",
              utility === null
                ? "text-kv-faint"
                : utility < 0.9
                  ? "text-kv-attack"
                  : "text-kv-secure",
            )}
          >
            {utility === null
              ? "not measured yet"
              : utility >= 0.9
                ? "Above the 90% floor"
                : "Below the 90% floor"}
          </p>
          <p className="truncate text-[11.5px] text-kv-faint">
            normal requests still served
          </p>
        </div>
      </div>
      <div className="border-l border-kv-border px-4 py-3">
        <p className="text-[12.5px] text-kv-muted">Exploits caught</p>
        <div className="mt-1 h-10">
          <Figure value={any ? caught : null} tone="var(--kv-attack)" />
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-kv-faint">
          flagged by code, not a model
        </p>
      </div>
      <div className="col-span-2 border-t border-kv-border px-4 py-3 sm:col-span-1 sm:border-t-0 sm:border-l">
        <p className="truncate text-[12.5px] text-kv-muted">
          Blocked by guardrails
        </p>
        <div className="mt-1 h-10">
          <Figure value={any ? blocked : null} tone="var(--kv-defend)" />
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-kv-faint">
          {tth != null
            ? `first patch in ${Math.round(tth)}s`
            : "calls the patch stopped"}
        </p>
      </div>
    </div>
  );
}
