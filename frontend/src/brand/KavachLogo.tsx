import "./kavach-logo.css";

/**
 * Kavach "Guardrail K" logo: a guardrail bar (|) with an attack chevron (<) striking it.
 *
 * States (drive them from the live run, see docs/assets/brand/BRAND.md → "Logo states"):
 *  - idle     the rail breathes softly
 *  - attack   the chevron strikes the rail on a loop (attacks in flight)
 *  - breach   the chevron punches through, the rail turns rose and shakes (a breach was detected)
 *  - secured  the rail turns mint and a gold ring pulses once (a patch was approved)
 */
export type KavachLogoState = "idle" | "attack" | "breach" | "secured";

type Props = {
  /** Height of the mark in px. The wordmark scales with it. */
  size?: number;
  state?: KavachLogoState;
  /** Show the "Kavach" wordmark next to the mark. */
  wordmark?: boolean;
  className?: string;
  /** Accessible label. */
  title?: string;
};

export function KavachLogo({
  size = 40,
  state = "idle",
  wordmark = false,
  className = "",
  title = "Kavach",
}: Props) {
  return (
    <span
      className={`kv-logo kv-logo--${state} ${className}`}
      style={{ height: size }}
      role="img"
      aria-label={wordmark ? title : `${title} logo`}
    >
      <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden="true" focusable="false">
        <g className="kv-logo__body">
          <rect className="kv-logo__rail" x="25.5" y="22" width="18" height="84" rx="9" />
          <g className="kv-logo__chevron">
            <polyline
              points="93.5,24 55.5,64 93.5,104"
              fill="none"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <circle className="kv-logo__spark" cx="46.5" cy="64" r="9" fill="none" strokeWidth="3.5" />
        </g>
      </svg>
      {wordmark && (
        <span className="kv-logo__wordmark" style={{ fontSize: size * 0.82 }}>
          Kavach
        </span>
      )}
    </span>
  );
}

export default KavachLogo;
