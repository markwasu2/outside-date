import { WorldCampusTraffic } from './WorldCampusTraffic';
import { WorldCampusWoodland } from './WorldCampusWoodland';
import { worldCampusLayout } from './worldCampusLayout';
/** One undistorted ground camera. The physical site grows with the hall count. */
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
  const { width, height, columns, rows, utilityX, halls } = worldCampusLayout(count);
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
        <pattern id="real-world-paving" width="70" height="65" patternUnits="userSpaceOnUse">
          <path d="M0 0H70V65" fill="none" stroke="#8ca093" strokeWidth=".6" opacity=".4" />
        </pattern>
      </defs>
      <g style={{ filter: night ? 'brightness(.6) saturate(.8)' : undefined }}>
        <rect width={width} height={height} fill="url(#real-world-turf)" />
        <path d={`M0 48H${width}`} stroke="#d9d6b9" strokeWidth="39" />
        <path d={`M0 48H${width}`} stroke="#63756f" strokeWidth="31" />
        <path d={`M0 48H${width}`} stroke="#dbd7b5" strokeWidth="1" strokeDasharray="12 13" />
        {land && (
          <>
            <rect
              x="145"
              y="95"
              width={columns * 310 + 30}
              height={rows * 250 + 25}
              fill={fitted ? '#c7cfc1' : '#c3b18b'}
              stroke="#e5e6d0"
              strokeWidth="4"
            />
            <rect
              x="145"
              y="95"
              width={columns * 310 + 30}
              height={rows * 250 + 25}
              fill="url(#real-world-paving)"
            />
            <rect
              x={utilityX - 30}
              y="140"
              width="220"
              height={height - 250}
              fill={fitted ? '#b4bfae' : '#bdad8c'}
              stroke="#e5e6d0"
              strokeWidth="4"
            />
            <path
              d={`M120 48V${height - 75}H${utilityX + 195}V48`}
              fill="none"
              stroke="#d9d6b9"
              strokeWidth="39"
            />
            <path
              d={`M120 48V${height - 75}H${utilityX + 195}V48`}
              fill="none"
              stroke="#63756f"
              strokeWidth="31"
            />
            <path
              d={`M120 48V${height - 75}H${utilityX + 195}V48`}
              fill="none"
              stroke="#dbd7b5"
              strokeWidth="1"
              strokeDasharray="12 13"
            />
            {Array.from({ length: rows }, (_, r) => (
              <g key={r}>
                <path
                  d={`M135 ${r * 250 + 329}H${utilityX + 180}`}
                  fill="none"
                  stroke="#dde0c8"
                  strokeWidth="30"
                />
                <path
                  d={`M135 ${r * 250 + 329}H${utilityX + 180}`}
                  fill="none"
                  stroke="#6a7d73"
                  strokeWidth="24"
                />
                <path
                  d={`M135 ${r * 250 + 329}H${utilityX + 180}`}
                  fill="none"
                  stroke="#d7d9bc"
                  strokeWidth="1"
                  strokeDasharray="9 12"
                />
              </g>
            ))}
            <g data-testid="campus-perimeter" data-state={fitted ? 'finished' : 'construction'}>
              <path
                d={`M155 89H${utilityX + 180}V${height - 90}H155V89`}
                fill="none"
                stroke="#6c846d"
                strokeWidth="2"
              />
              {Array.from({ length: Math.ceil((width - 250) / 28) }, (_, i) => (
                <path
                  key={i}
                  d={`M${160 + i * 28} 90v-12M${160 + i * 28} ${height - 90}v-12`}
                  stroke="#60796c"
                  strokeWidth="2"
                />
              ))}
            </g>
          </>
        )}
        {land && (
          <g data-testid="world-court-detail" fill="none">
            {halls.map(({ x, y }, i) => (
              <g key={i}>
                <path
                  d={`M${x + 15} ${y + 27}h260m-260 190h260`}
                  stroke="#ebe9d6"
                  strokeWidth="1.5"
                  opacity=".7"
                />
                <path d={`M${x + 7} ${y + 50}v145`} stroke="#7b9082" strokeWidth="4" opacity=".3" />
                {[0, 1].map((n) => (
                  <g key={n} transform={`translate(${x + 8} ${y + 76 + n * 85})`}>
                    <rect width="6" height="24" fill="#657b70" />
                    {[4, 10, 16, 22].map((d) => (
                      <path key={d} d={`M1 ${d}h4`} stroke="#c3cdba" strokeWidth="1" />
                    ))}
                  </g>
                ))}
              </g>
            ))}
            <path
              d={`M${utilityX - 19} 155v${height - 292}`}
              stroke="#7a8f7c"
              strokeWidth="13"
              opacity=".35"
            />
            {Array.from({ length: Math.floor((height - 300) / 18) }, (_, i) => (
              <path
                key={i}
                d={`M${utilityX - 24} ${163 + i * 18}l10 8`}
                stroke="#ded09b"
                strokeWidth="1.6"
                opacity=".8"
              />
            ))}
          </g>
        )}
        {land && (
          <>
            <g data-testid="world-parking">
              <rect
                x={utilityX - 15}
                y="82"
                width="155"
                height="42"
                fill="#6e8074"
                stroke="#d6dac3"
                strokeWidth="2"
              />
              {[0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M${utilityX - 10 + i * 38} 85v34`}
                  stroke="#e1dfc6"
                  strokeWidth="1"
                />
              ))}
              {['#dfc58a', '#8daca4', '#b7c3b1'].map((color, i) => (
                <g
                  key={i}
                  data-testid="parked-campus-car"
                  transform={`translate(${utilityX + 6 + i * 38} 103)`}
                >
                  <ellipse cx="2" cy="3" rx="14" ry="6" fill="#284b3b" opacity=".2" />
                  <rect
                    x="-11"
                    y="-6"
                    width="22"
                    height="12"
                    rx="4"
                    fill={color}
                    stroke="#6f8980"
                    strokeWidth=".8"
                  />
                  <path d="M-4-5h7l3 3v4H-6v-4z" fill="#476c75" />
                  <path d="M-8-6v-1m15 1v-1m-15 14v-1m15 1v-1" stroke="#334b49" strokeWidth="2" />
                </g>
              ))}
            </g>
            {[
              { x: 155, y: 100 },
              { x: utilityX + 160, y: 135 },
              { x: 155, y: height - 90 },
              { x: utilityX + 160, y: height - 90 },
            ].map(({ x, y }, i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <ellipse cx="5" cy="3" rx="10" ry="3" fill="#294d3e" opacity=".2" />
                <path d="M0 0v-43l13-3" stroke="#69837b" strokeWidth="2" fill="none" />
                <path d="M8-47h12v4H8z" fill={night ? '#ffe7a2' : '#c5d4c4'} />
              </g>
            ))}
          </>
        )}
        {poles > 0 && (
          <g data-testid="world-power-poles">
            <path
              d={Array.from(
                { length: poles },
                (_, i) => `${i ? 'L' : 'M'}${width - 150 - i * 110} 18`,
              ).join(' ')}
              fill="none"
              stroke="#6a796c"
              strokeWidth=".8"
            />
            {Array.from({ length: poles }, (_, i) => (
              <g
                key={i}
                data-testid="world-power-pole"
                transform={`translate(${width - 150 - i * 110} 69)`}
              >
                <ellipse cx="7" cy="2" rx="12" ry="3" fill="#304d3c" opacity=".2" />
                <path
                  d="M0 0v-59m-11 8h22m-9-7v10m-4-10v10"
                  fill="none"
                  stroke="#7e8165"
                  strokeWidth="2"
                />
                <path d="M-9-54v-5m18 5v-5" stroke="#aab69c" strokeWidth="3" />
              </g>
            ))}
          </g>
        )}
        <WorldCampusTraffic
          width={width}
          height={height}
          night={night}
          working={working}
          reducedMotion={reducedMotion}
        />
        {land && (
          <>
            <g
              data-testid="world-gatehouse"
              transform={`translate(78 ${height - 112}) translate(-202 -561)`}
            >
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
                <path
                  d="M206 544l14-5"
                  stroke="#a8c6bf"
                  strokeWidth=".6"
                  opacity=".65"
                  fill="none"
                />
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
            </g>

            <path d={`M108 ${height - 99}h25`} stroke="#e4d5a5" strokeWidth="3" />
            <path
              d={`M108 ${height - 99}h25`}
              stroke="#aa7456"
              strokeWidth="3"
              strokeDasharray="4 4"
            />
          </>
        )}
        <WorldCampusWoodland width={width} height={height} />
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
          <defs>
            <radialGradient id="world-lamp-pool">
              <stop stopColor="#ffe9a4" stopOpacity=".3" />
              <stop offset="1" stopColor="#ffe9a4" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[
            { x: 155, y: 100 },
            { x: utilityX + 160, y: 135 },
            { x: 155, y: height - 90 },
            { x: utilityX + 160, y: height - 90 },
          ].map(({ x, y }, i) => (
            <ellipse key={i} cx={x + 10} cy={y + 3} rx="44" ry="24" />
          ))}
        </g>
      )}
    </svg>
  );
}
