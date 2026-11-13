import type { WorldPoint } from './worldCampusLayout';
export function WorldCampusTraffic({
  night,
  working,
  reducedMotion,
  road,
  service,
}: {
  width: number;
  height: number;
  night: boolean;
  working: boolean;
  reducedMotion: boolean;
  road: WorldPoint[];
  service: WorldPoint[];
}) {
  const d = (points: WorldPoint[]) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const truck = (
    <g transform="rotate(30) scale(1 .57)">
      <defs>
        <linearGradient id="traffic-body" x2="0" y2="1">
          <stop stopColor="#eef1e5" />
          <stop offset="1" stopColor="#a5b5ae" />
        </linearGradient>
      </defs>
      <ellipse cx="1" cy="4" rx="25" ry="8" fill="#183a35" opacity=".2" />

      <path
        d="M-22 -7h8m-8 14h8m15-14h7M1 7h7m10-14h5m-5 14h5"
        stroke="#304e51"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M-22 0h46" stroke="#506e6c" strokeWidth="7" />
      <rect
        x="-24"
        y="-6"
        width="34"
        height="12"
        rx="1.5"
        fill="url(#traffic-body)"
        stroke="#637d7c"
        strokeWidth=".7"
      />
      <path d="M-22 -3h30M-22 1h30M-22 4h30" stroke="#ccd6cb" strokeWidth=".5" />
      <path d="M-24 -5v10M-22 -5v10" stroke="#8da49d" strokeWidth=".65" />
      <rect
        x="12"
        y="-6"
        width="13"
        height="12"
        rx="2"
        fill="#d1a95e"
        stroke="#816f46"
        strokeWidth=".7"
      />
      <path d="M13 -4h4v8h-4z" fill="#edcf87" stroke="#aa8748" strokeWidth=".4" />
      <path d="M19 -5h3.5l1 2v6l-1 2H19z" fill="#365f68" stroke="#b2c8bc" strokeWidth=".4" />
      <path d="M20 -4v8" stroke="#88a7a4" strokeWidth=".6" />
      <path d="M18 -6v-2h3m-3 14v2h3" fill="none" stroke="#617a70" strokeWidth="1" />
      <path d="M25 -4v8" stroke="#c7cdb8" strokeWidth="1.3" />

      {night && <path d="M25-4l55-12v32L25 4z" fill="#ffe9a4" opacity=".16" />}
    </g>
  );
  return (
    <g data-testid="world-road-traffic">
      <g
        transform={
          reducedMotion
            ? `translate(${road[0]!.x + (road[1]!.x - road[0]!.x) * 0.4} ${road[0]!.y + (road[1]!.y - road[0]!.y) * 0.4})`
            : undefined
        }
      >
        {truck}
        {!reducedMotion && <animateMotion dur="38s" repeatCount="indefinite" path={d(road)} />}
      </g>
      {working && (
        <g transform={reducedMotion ? `translate(${service[1]!.x} ${service[1]!.y})` : undefined}>
          <g transform="rotate(-30) scale(.7 .4)">{truck}</g>
          {!reducedMotion && (
            <animateMotion dur="45s" repeatCount="indefinite" path={d(service.slice(0, 2))} />
          )}
        </g>
      )}
    </g>
  );
}
