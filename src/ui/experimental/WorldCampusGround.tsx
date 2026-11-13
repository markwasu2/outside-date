import { WorldCampusWoodland } from './WorldCampusWoodland';
import { worldCampusLayout } from './worldCampusLayout';
import { WorldCampusTraffic } from './WorldCampusTraffic';
export function WorldCampusGround({
  count,
  night,
  land,
  fitted,
  theme,
  working = false,
  reducedMotion = false,
  workers = [],
  poles = 0,
}: {
  count: number;
  night: boolean;
  land: boolean;
  fitted: boolean;
  theme: string;
  working?: boolean;
  reducedMotion?: boolean;
  workers?: { x: number; y: number }[];
  poles?: number;
}) {
  const l = worldCampusLayout(count),
    { width, height, columns, rows, project: p, right, bottom, utilityWorldX } = l;
  const pts = (v: { x: number; y: number }[]) => v.map((q) => `${q.x},${q.y}`).join(' ');
  const quad = (x: number, y: number, w: number, h: number) =>
    pts([p(x, y), p(x + w, y), p(x + w, y + h), p(x, y + h)]);
  const route = (a: number[][]) => a.map(([x, y]) => p(x!, y!));
  const roads = [
    route([
      [-270, -120],
      [right + 40, -120],
    ]),
    route([
      [-125, -120],
      [-125, bottom],
      [right, bottom],
      [right, -120],
    ]),
    route([
      [columns * 210 - 40, -120],
      [columns * 210 - 40, bottom],
    ]),
    ...Array.from({ length: rows }, (_, r) =>
      route([
        [-125, r * 180 + 90],
        [right, r * 180 + 90],
      ]),
    ),
  ];
  const gate = p(-150, -70);
  const lights = [
    [-100, -80],
    [right - 20, -80],
    [-100, bottom - 20],
    [right - 20, bottom - 20],
  ].map(([x, y]) => p(x!, y!));
  return (
    <svg
      data-testid="world-ground"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="real-world-turf" x2=".4" y2="1">
          <stop
            stopColor={
              theme === 'quarry'
                ? '#b5ad96'
                : theme === 'depot'
                  ? '#b4ae87'
                  : theme === 'meadow'
                    ? '#a6bd84'
                    : '#afbb8e'
            }
          />
          <stop
            offset="1"
            stopColor={
              theme === 'quarry'
                ? '#858d75'
                : theme === 'depot'
                  ? '#7c8c6d'
                  : theme === 'meadow'
                    ? '#60875c'
                    : '#849a72'
            }
          />
        </linearGradient>
        <radialGradient id="world-lamp-pool">
          <stop stopColor="#ffe9a4" stopOpacity=".3" />
          <stop offset="1" stopColor="#ffe9a4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g style={{ filter: night ? 'brightness(.6) saturate(.8)' : undefined }}>
        <rect width={width} height={height} fill="url(#real-world-turf)" />
        {land && (
          <>
            <polygon
              points={quad(-110, -100, right + 100, bottom + 100)}
              fill={fitted ? '#89a17a' : '#b5aa80'}
              stroke="#718a6d"
              strokeWidth="2"
            />
            <g
              data-testid="campus-perimeter"
              data-state={fitted ? 'finished' : 'construction'}
              fill="none"
              stroke="#66816c"
              strokeWidth="1.2"
            >
              <polygon points={quad(-110, -100, right + 100, bottom + 100)} />
              {Array.from({ length: Math.ceil((right + 100) / 32) }, (_, i) =>
                [-100, bottom].map((y) => {
                  const q = p(-110 + i * 32, y);
                  return <path key={`${i}-${y}`} d={`M${q.x} ${q.y}v-10`} />;
                }),
              )}
            </g>
            {Array.from({ length: count }, (_, i) => {
              const x = (i % columns) * 210,
                y = Math.floor(i / columns) * 180;
              return (
                <g key={i} data-testid="world-hall-apron">
                  <polygon
                    points={quad(x - 86, y - 64, 172, 128)}
                    fill={fitted ? '#c9d0c1' : '#c4b18b'}
                    stroke="#e1e2cd"
                    strokeWidth="2"
                  />
                  {[-60, -20, 20, 60].map((dx) => (
                    <polyline
                      key={dx}
                      points={pts([p(x + dx, y - 62), p(x + dx, y + 62)])}
                      stroke="#93a58f"
                      strokeWidth=".5"
                      opacity=".5"
                    />
                  ))}
                </g>
              );
            })}
            <polygon
              points={quad(utilityWorldX - 65, -75, 135, 340)}
              fill={fitted ? '#b7c4b0' : '#bbad8c'}
              stroke="#dde1cc"
              strokeWidth="2"
            />
          </>
        )}
        {land && (
          <>
            <polygon
              points={quad(utilityWorldX - 50, -190, 350, 100)}
              fill="#a1afa0"
              stroke="#d2d6bd"
              strokeWidth="2"
            />
            <polyline
              points={pts([p(utilityWorldX - 50, -100), p(utilityWorldX + 290, -100)])}
              stroke="#e2d6a6"
              strokeWidth="1"
              strokeDasharray="6 8"
            />
          </>
        )}
        {roads
          .filter((_, i) => land || i === 0)
          .map((road, i) => (
            <g key={i}>
              <polyline
                points={pts(road)}
                fill="none"
                stroke="#c6cbb0"
                strokeWidth="28"
                strokeLinejoin="round"
              />
              <polyline
                points={pts(road)}
                fill="none"
                stroke="#687b72"
                strokeWidth="22"
                strokeLinejoin="round"
              />
              <polyline
                points={pts(road)}
                fill="none"
                stroke="#d9dac1"
                strokeWidth="1"
                strokeDasharray="9 11"
              />
            </g>
          ))}
        {land && (
          <g data-testid="world-parking">
            <polygon
              points={quad(utilityWorldX - 60, -108, 130, 26)}
              fill="#738878"
              stroke="#d6dac3"
              strokeWidth="1"
            />
            {[0, 1, 2].map((i) => {
              const q = p(utilityWorldX - 40 + i * 40, -95);
              return (
                <g
                  key={i}
                  data-testid="parked-campus-car"
                  transform={`translate(${q.x} ${q.y}) rotate(30) scale(1 .57)`}
                >
                  <ellipse cx="2" cy="3" rx="14" ry="6" fill="#284b3b" opacity=".2" />
                  <rect
                    x="-11"
                    y="-6"
                    width="22"
                    height="12"
                    rx="4"
                    fill={['#dfc58a', '#8daca4', '#b7c3b1'][i]}
                  />
                  <path d="M-4-5h7l3 3v4H-6v-4z" fill="#476c75" />
                </g>
              );
            })}
          </g>
        )}
        {lights.map(
          ({ x, y }, i) =>
            land && (
              <g key={i} transform={`translate(${x} ${y})`}>
                <ellipse cx="5" cy="3" rx="10" ry="3" fill="#294d3e" opacity=".2" />
                <path d="M0 0v-43l13-3" stroke="#69837b" strokeWidth="2" fill="none" />
                <path d="M8-47h12v4H8z" fill={night ? '#ffe7a2' : '#c5d4c4'} />
              </g>
            ),
        )}
        {poles > 0 && (
          <g data-testid="world-power-poles">
            {Array.from({ length: poles }, (_, i) => {
              const q = p(80 + i * 100, -158);
              return (
                <g key={i} data-testid="world-power-pole" transform={`translate(${q.x} ${q.y})`}>
                  <path
                    d="M0 0v-59m-11 8h22m-9-7v10m-4-10v10"
                    stroke="#7e8165"
                    strokeWidth="2"
                    fill="none"
                  />
                  <path d="M-9-54v-5m18 5v-5" stroke="#aab69c" strokeWidth="3" />
                </g>
              );
            })}
          </g>
        )}
        <WorldCampusTraffic
          width={width}
          height={height}
          night={night}
          working={working}
          reducedMotion={reducedMotion}
          road={roads[0]!}
          service={roads[1]!}
        />
        <WorldCampusWoodland
          width={width}
          height={height}
          points={[
            ...Array.from({ length: Math.ceil((right + 200) / 80) }, (_, i) =>
              p(-200 + i * 80, bottom + 50),
            ),
            ...Array.from({ length: Math.ceil((bottom + 250) / 85) }, (_, i) =>
              p(right + 65, -160 + i * 85),
            ),
            ...Array.from({ length: Math.ceil((right + 100) / 100) }, (_, i) =>
              p(-100 + i * 100, -200),
            ),
          ]}
        />
        {land && (
          <g
            data-testid="world-gatehouse"
            transform={`translate(${gate.x} ${gate.y}) translate(-202 -561)`}
          >
            <ellipse cx="207" cy="560" rx="30" ry="8" fill="#29443b" opacity=".22" />
            <path d="M181 524l24 -8 21 12v25l-24 8 -21 -12z" fill="#b2b9a3" />
            <path d="M181 524l21 12v25l-21 -12z" fill="#c9ccaf" />
            <path d="M202 536l24 -8v25l-24 8z" fill="#758c81" />
            <path d="M178 522l27 -9 25 13 -28 11z" fill="#e1dfc2" />
            <path
              d="M194 536l4 2v8l-4 -2zM206 540l14 -5v11l-14 5z"
              fill={night ? '#c0c79a' : '#53737a'}
            />
            <g data-testid="entry-gatehouse-detail">
              {/* Glazing, door and folded roof stay inside the existing gatehouse footprint. */}
              <path d="M181 549l21 12 24-8v3l-24 8-21-12z" fill="#5a7769" />
              <path d="M181 525l21 12 25-9" stroke="#f1e8c8" strokeWidth="1" fill="none" />
              <path
                d="M185 522l20-6 20 11m-32-7 21 12m-14-14 21 11"
                stroke="#b1b49c"
                strokeWidth=".7"
                fill="none"
              />
              <path
                d="M207 540v11m6-13v11M196 538v6"
                stroke="#cfdbc1"
                strokeWidth=".8"
                fill="none"
              />
              <path d="M206 544l14-5" stroke="#a8c6bf" strokeWidth=".6" opacity=".65" fill="none" />
              <path
                data-testid="gatehouse-human-door"
                d="M184 529l8 4v20l-8-4z"
                fill="#526e69"
                stroke="#d4d4b7"
                strokeWidth=".6"
              />
              <path d="M190 541v2" stroke="#d9cb91" strokeWidth=".8" />
              <path d="M217 550l4-1v3l-4 1z" fill="#415f5d" />
              <path d="M218 550v2" stroke={night ? '#d8cd87' : '#a2ba91'} strokeWidth="1" />
              <path d="M192 558l11 7 20-7v3l-20 7-11-7z" fill="#adb49b" />
              <path d="M193 557l10 6 20-7-10-4z" fill="#d8d5b9" />
            </g>
            <path d="M225 565l25-14" stroke="#eddbaf" strokeWidth="3" />
            <path d="M225 565l25-14" stroke="#a87055" strokeWidth="3" strokeDasharray="4 4" />
          </g>
        )}
        {workers.map(({ x, y }, i) => (
          <g
            key={i}
            data-testid="world-working-person"
            transform={`translate(${x} ${y}) scale(.8)`}
          >
            <ellipse cy="7.5" rx="6" ry="2.5" fill="#243e35" opacity=".25" />
            <path d="M-2 1l-2 6m5-6 2 6" stroke="#3b5962" strokeWidth="2" />
            <path d="M0-7V2" stroke="#e5c871" strokeWidth="3.8" />
            <circle cy="-10" r="2.5" fill="#e7cda0" />
            <path d="M-3.3-11h6.6" stroke="#ffe4a1" strokeWidth="2" />
          </g>
        ))}
      </g>
      {night && land && (
        <g data-testid="world-night-pools" fill="url(#world-lamp-pool)">
          {lights.map(({ x, y }, i) => (
            <ellipse key={i} cx={x + 10} cy={y + 3} rx="44" ry="24" />
          ))}
        </g>
      )}
    </svg>
  );
}
