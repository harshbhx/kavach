"use client";
import "./agent-avatar.css";
import { useEffect } from "react";

/**
 * The seven Kavach agents as small original characters, drawn from simple shapes (no external assets).
 *
 * Squads share a body colour (red = attack rose, blue = defence teal, neutral = referee ochre) and every agent has its own
 * prop, so the room is readable at 28px: Recon's scanner antenna and monocle, the Injector's spikes and attack chevron,
 * the Social Engineer's headset, the Monitor's glasses and alert light, the Patcher's hard hat and bandage, the Auditor's
 * spectacles and check badge, the Referee's cap and whistle.
 *
 * Motion (all CSS, in agent-avatar.css): the body breathes, the eyes blink, and the pupils lean toward the pointer. All of
 * it stops under prefers-reduced-motion; only the expression remains. The SVG is decoration (aria-hidden) unless `label` is
 * given; whatever an agent "says" is real text next to it.
 */
export type AgentId = "recon" | "injection" | "social" | "monitor" | "patcher" | "auditor" | "referee";
export type AgentExpression = "idle" | "talking" | "thinking" | "happy" | "alert";

export const AGENT_IDS: readonly AgentId[] = ["recon", "injection", "social", "monitor", "patcher", "auditor", "referee"];

const SQUAD: Record<AgentId, "red" | "blue" | "neutral"> = {
  recon: "red",
  injection: "red",
  social: "red",
  monitor: "blue",
  patcher: "blue",
  auditor: "blue",
  referee: "neutral",
};

const PALETTE = {
  red: { body: "#c8203f", shade: "#8f1530" },
  blue: { body: "#0b6e7f", shade: "#07505d" },
  neutral: { body: "#b7791f", shade: "#8a5a12" },
} as const;

const INK = "#10231c";
const PLATE = "#f6f3e9";

/** One pointer listener for every avatar on the page; it publishes where the pointer is as -1..1 on :root. */
let followers = 0;
let stop: (() => void) | null = null;
function startFollowing() {
  followers += 1;
  if (stop || typeof window === "undefined") return;
  let raf = 0;
  const on = (e: PointerEvent) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const s = document.documentElement.style;
      s.setProperty("--kav-px", String(Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))));
      s.setProperty("--kav-py", String(Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))));
    });
  };
  window.addEventListener("pointermove", on, { passive: true });
  stop = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", on);
    stop = null;
  };
}
function stopFollowing() {
  followers = Math.max(0, followers - 1);
  if (followers === 0) stop?.();
}

export function AgentAvatar({
  agent,
  size = 64,
  expression = "idle",
  animate = true,
  follow = true,
  label,
  className = "",
}: {
  agent: AgentId;
  size?: number;
  expression?: AgentExpression;
  /** Breathing and blinking. Reduced-motion visitors never get them regardless. */
  animate?: boolean;
  /** Pupils lean toward the pointer. */
  follow?: boolean;
  /** Accessible name. Without it the avatar is decorative. */
  label?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!follow || expression === "thinking") return;
    startFollowing();
    return stopFollowing;
  }, [follow, expression]);

  const { body, shade } = PALETTE[SQUAD[agent]];
  const ex = [38, 62];
  const ey = 50;
  const eyes = (
    <g className={animate ? "kav-blink" : undefined}>
      <g className={expression === "thinking" ? "kav-look-up" : follow ? "kav-look" : undefined}>
        {ex.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={ey} rx={expression === "alert" ? 4.4 : 3.4} ry={expression === "alert" ? 5.4 : 4.2} fill={INK} />
            <circle cx={x + 1.1} cy={ey - 1.4} r="1.1" fill={PLATE} />
          </g>
        ))}
      </g>
    </g>
  );

  const mouth =
    expression === "talking" ? (
      <ellipse className="kav-talk" cx="50" cy="65" rx="4.6" ry="3.6" fill={INK} />
    ) : expression === "happy" ? (
      <path d="M41 62q9 12 18 0z" fill={INK} />
    ) : expression === "alert" ? (
      <ellipse cx="50" cy="66" rx="3" ry="3.8" fill={INK} />
    ) : expression === "thinking" ? (
      <path d="M45 66q5 -2.5 10 0" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    ) : (
      <path d="M42 63q8 7 16 0" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    );

  const brows =
    expression === "alert" ? (
      <path d="M32 40q6 -4 12 0M56 40q6 -4 12 0" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    ) : null;

  // Everything drawn behind the head
  const behind = {
    recon: (
      <g>
        <path d="M50 18V8" stroke={shade} strokeWidth="3" strokeLinecap="round" />
        <circle className="kav-ping" cx="50" cy="6" r="5" fill="none" stroke="#e0a21b" strokeWidth="1.6" />
        <circle cx="50" cy="6" r="3.2" fill="#e0a21b" />
      </g>
    ),
    injection: <path d="M22 24L28 5L38 18L44 15L50 1L56 15L62 18L72 5L78 24Z" fill={shade} />,
    social: (
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M17 46C17 6 83 6 83 46" />
      </g>
    ),
    monitor: (
      <g>
        <rect x="44" y="5" width="12" height="13" rx="6" fill="#e0a21b" />
        <rect className="kav-ping" x="44" y="5" width="12" height="13" rx="6" fill="none" stroke="#e0a21b" strokeWidth="1.6" />
      </g>
    ),
    patcher: null,
    auditor: null,
    referee: null,
  }[agent];

  // Everything drawn in front of the face
  const front = {
    recon: (
      <g>
        <circle cx="62" cy="50" r="8.6" fill="none" stroke={INK} strokeWidth="2.6" />
        <path d="M70.4 52L80 62" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
    injection: <path d="M47 33l-6 4.6l6 4.6" stroke={body} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
    social: (
      <g>
        <rect x="9" y="42" width="8" height="16" rx="4" fill={INK} />
        <rect x="83" y="42" width="8" height="16" rx="4" fill={INK} />
        <path d="M13 56q0 16 18 17" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <circle cx="33" cy="73" r="3.4" fill={INK} />
        <circle cx="29" cy="61" r="4" fill={body} opacity="0.22" />
        <circle cx="71" cy="61" r="4" fill={body} opacity="0.22" />
      </g>
    ),
    monitor: (
      <g fill="none" stroke={INK} strokeWidth="3">
        <circle cx="38" cy="50" r="9.4" />
        <circle cx="62" cy="50" r="9.4" />
        <path d="M47.4 50h5.2" />
      </g>
    ),
    patcher: (
      <g>
        <path d="M15 36Q15 9 50 9Q85 9 85 36Z" fill="#e0a21b" />
        <rect x="46" y="9" width="8" height="27" fill="#c98a0f" />
        <rect x="10" y="33" width="80" height="7" rx="3.5" fill="#c98a0f" />
        <g transform="rotate(-18 67 62)">
          <rect x="59" y="58" width="16" height="8" rx="3.4" fill="#ead7ae" stroke="#b79a5a" strokeWidth="0.8" />
          <circle cx="65" cy="62" r="0.9" fill="#b79a5a" />
          <circle cx="69" cy="62" r="0.9" fill="#b79a5a" />
        </g>
      </g>
    ),
    auditor: (
      <g>
        <rect x="30" y="10" width="40" height="9" rx="4.5" fill={shade} />
        <g fill="none" stroke={INK} strokeWidth="2.2">
          <circle cx="38" cy="50" r="8.4" />
          <circle cx="62" cy="50" r="8.4" />
          <path d="M46.4 50h7.2" />
        </g>
      </g>
    ),
    referee: (
      <g>
        <path d="M20 32Q20 9 50 9Q80 9 80 32Z" fill="#222" />
        <rect x="35" y="10" width="6" height="21" fill="#f6f3e9" opacity="0.9" />
        <rect x="59" y="10" width="6" height="21" fill="#f6f3e9" opacity="0.9" />
        <rect x="18" y="30" width="64" height="6" rx="3" fill="#222" />
      </g>
    ),
  }[agent];

  // On the chest
  const chest = {
    auditor: (
      <g>
        <circle cx="50" cy="88" r="6.4" fill={PLATE} />
        <path d="M46.4 88l2.8 2.8l4.6 -5.4" stroke={body} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    ),
    referee: (
      <g>
        <path d="M44 80q6 10 12 0" stroke="#222" strokeWidth="1.4" fill="none" />
        <circle cx="50" cy="90" r="4.4" fill="#f6f3e9" stroke="#222" strokeWidth="1.4" />
      </g>
    ),
    recon: null,
    injection: null,
    social: null,
    monitor: null,
    patcher: null,
  }[agent];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      focusable="false"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`kav-avatar shrink-0 overflow-visible ${className}`}
      data-agent={agent}
    >
      <g className={animate ? "kav-bob" : undefined}>
        {behind}
        <rect x="30" y="78" width="40" height="18" rx="9" fill={body} />
        <rect x="14" y="16" width="72" height="64" rx="26" fill={body} />
        <rect x="22" y="30" width="56" height="42" rx="18" fill={PLATE} />
        {brows}
        {eyes}
        {mouth}
        {front}
        {chest}
      </g>
    </svg>
  );
}
