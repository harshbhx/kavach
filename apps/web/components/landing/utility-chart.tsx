/** Breach rate falls, utility of the approved patch stays high, and the vetoed attempt sits below the floor. */
const W = 520;
const H = 260;
const PAD = { l: 44, r: 44, t: 18, b: 34 };
const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / 2;
const y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);

const breach = [100, 0, 0];
const utility = [100, 100, 100];

export function UtilityChart() {
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Breach rate falls from 100% to 0% while utility stays at 100%; one patch at 70% utility was vetoed.">
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="#26263a" strokeDasharray="3 5" />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b6b80">
              {v}%
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(90)} y2={y(90)} stroke="#34d399" strokeOpacity="0.45" strokeDasharray="6 4" />
        <text x={W - PAD.r - 16} y={y(90) + 16} textAnchor="end" fontSize="11" fill="#34d399" fillOpacity="0.8">
          90% utility floor
        </text>
        {['Round 1', 'Round 2', 'Round 3'].map((r, i) => (
          <text key={r} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b6b80">
            {r}
          </text>
        ))}
        <path d={path(utility)} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
        <path d={path(breach)} fill="none" stroke="#ff4d6d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {breach.map((v, i) => (
          <circle key={`b${i}`} cx={x(i)} cy={y(v)} r="5" fill="#ff4d6d" />
        ))}
        {utility.map((v, i) => (
          <circle key={`u${i}`} cx={x(i)} cy={y(v)} r="9" fill="none" stroke="#34d399" strokeWidth="2.5" />
        ))}
        <circle cx={x(0)} cy={y(70)} r="7" fill="#0a0a16" stroke="#ff4d6d" strokeWidth="2.5" />
        <path d={`M${x(0) + 5},${y(70) + 6} L${x(0) + 22},${y(34) - 12}`} stroke="#ff4d6d" strokeOpacity="0.6" strokeDasharray="2 3" />
        <text x={x(0) + 14} y={y(34)} fontSize="12" fontWeight="600" fill="#ff4d6d">
          vetoed patch
        </text>
        <text x={x(0) + 14} y={y(34) + 15} fontSize="11" fill="#a1a1b5">
          70% utility, below the floor
        </text>
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-kv-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-kv-attack" /> breach rate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border-2 border-kv-secure" /> utility of the approved patch
        </span>
        <span>Numbers from the offline sample run in the repo.</span>
      </figcaption>
    </figure>
  );
}
