/** Shared physical camera for ambient traffic. Scenery, never a paid order. */
export function WorldCampusTraffic({
  width,
  height,
  night,
  working,
  reducedMotion,
}: {
  width: number;
  height: number;
  night: boolean;
  working: boolean;
  reducedMotion: boolean;
}) {
  return (
    <g data-testid="world-road-traffic">
      <defs>
        <linearGradient id="traffic-body" x2="0" y2="1">
          <stop stopColor="#eef1e5" />
          <stop offset="1" stopColor="#a5b5ae" />
        </linearGradient>
        <linearGradient id="headlight-east">
          <stop stopColor="#ffe5a1" stopOpacity=".26" />
          <stop offset="1" stopColor="#ffe5a1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="headlight-west">
          <stop stopColor="#ffe5a1" stopOpacity="0" />
          <stop offset="1" stopColor="#ffe5a1" stopOpacity=".26" />
        </linearGradient>
        <linearGradient id="headlight-service" x2="0" y2="1">
          <stop stopColor="#ffe5a1" stopOpacity=".26" />
          <stop offset="1" stopColor="#ffe5a1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g
        className={reducedMotion ? undefined : 'world-traffic-east'}
        transform="translate(260 42)"
        data-testid="ambient-truck"
      >
        {night && (
          <g data-testid="road-truck-headlights">
            <path d="M25 -4l64 -14v34L25 4z" fill="url(#headlight-east)" />
            <path d="M25 -4v2m0 4v2" stroke="#fff0bc" strokeWidth="2.5" />
            <path d="M-24 -4v2m0 4v2" stroke="#d87855" strokeWidth="1.7" />
          </g>
        )}
        <ellipse cx="1" cy="4" rx="25" ry="8" fill="#183a35" opacity=".2" />
        <g data-testid="road-freight-vehicle">
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
        </g>
      </g>
      <g className={reducedMotion ? undefined : 'world-traffic-west'} transform="translate(830 56)">
        {night && (
          <g data-testid="road-car-headlights">
            <path d="M-12 -3l-48 -12v30L-12 3z" fill="url(#headlight-west)" />
            <path d="M-12 -3v2m0 2v2" stroke="#fff0bc" strokeWidth="2" />
            <path d="M12 -3v2m0 2v2" stroke="#d87855" strokeWidth="1.4" />
          </g>
        )}
        <ellipse cx="2" cy="3" rx="13" ry="6" fill="#183a35" opacity=".2" />
        <g data-testid="road-passenger-vehicle">
          <path
            d="M-8 -5h4m-4 10h4m9-10h4M5 5h4"
            stroke="#304e51"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M-12 -2q0 -3 4 -3h15q5 0 5 3v4q0 3 -5 3H-8q-4 0 -4 -3Z"
            fill="#e7d9b1"
            stroke="#8d9b87"
            strokeWidth=".7"
          />
          <path
            d="M-6 -3.8h3v7.6h-3l-1 -1.5v-4.6zM3 -3.8h3l1 1.5v4.6l-1 1.5H3z"
            fill="#496e78"
            stroke="#bed0bb"
            strokeWidth=".4"
          />
          <path d="M-2 -3.6h4v7.2h-4z" fill="#d4d7be" />
          <path d="M-10 -2v4M10 -2v4" stroke="#f3efda" strokeWidth="1" />
          <path d="M-3 -5v-1.5m0 11.5v1.5" stroke="#6e8980" strokeWidth="1.1" />
        </g>
      </g>
      {working && (
        <g
          className={reducedMotion ? undefined : 'world-service-truck'}
          transform={`translate(120 ${height - 110})`}
          data-testid="ambient-service-truck"
        >
          {night && (
            <g data-testid="service-truck-headlights">
              <path d="M-4 17l-13 43h34L4 17z" fill="url(#headlight-service)" />
              <path d="M-5 17h3m4 0h3" stroke="#fff0bc" strokeWidth="2" />
            </g>
          )}
          <ellipse cx="4" cy="2" rx="8" ry="18" fill="#263f38" opacity=".2" />
          <g data-testid="road-site-service-vehicle">
            <path
              d="M-6 -13v5M6 -13v5M-6 10v4M6 10v4"
              stroke="#304e51"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path d="M0 -13v29" stroke="#516f6a" strokeWidth="7" />
            <rect
              x="-6"
              y="-17"
              width="12"
              height="23"
              rx="1"
              fill="#d6d8bc"
              stroke="#7e927f"
              strokeWidth=".6"
            />
            <path d="M-3 -15V4M1 -15V4M4 -15V4" stroke="#b4c2a7" strokeWidth=".5" />
            <rect
              x="-6"
              y="7"
              width="12"
              height="10"
              rx="2"
              fill="#d4a04b"
              stroke="#8e7a49"
              strokeWidth=".5"
            />
            <path d="M-4 8h8v3h-8z" fill="#edcb7c" />
            <path d="M-5 12H5v2.5H-5z" fill="#4b6f74" stroke="#b8cabc" strokeWidth=".4" />
            <path d="M-4 17h8" stroke="#d3d3b7" strokeWidth="1.2" />
            <path d="M-6 11h-2M6 11h2" stroke="#58766b" strokeWidth="1" />
          </g>
        </g>
      )}
      <style>{`
 @keyframes worldTrafficEast{from{transform:translate(-70px,42px)}to{transform:translate(${width + 70}px,42px)}}
 @keyframes worldTrafficWest{from{transform:translate(${width + 70}px,56px)}to{transform:translate(-70px,56px)}}
 @keyframes worldService{0%{transform:translate(120px,95px)}45%{transform:translate(120px,${height - 110}px)}65%,100%{transform:translate(120px,${height - 110}px)}}
 .world-traffic-east{animation:worldTrafficEast 38s linear infinite;animation-delay:-10s}
 .world-traffic-west{animation:worldTrafficWest 29s linear infinite;animation-delay:-17s}
 .world-service-truck{animation:worldService 32s linear infinite;animation-delay:-12s}
 @media(prefers-reduced-motion:reduce){.world-traffic-east,.world-traffic-west,.world-service-truck{animation:none!important}}
 `}</style>
    </g>
  );
}
