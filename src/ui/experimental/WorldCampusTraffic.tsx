import type { WorldPoint } from './worldCampusLayout';

/** Vehicle roofs share the road's isometric axes; body height and wheels stay upright. */
export function RoadVehicle({
  car = false,
  parked = false,
  paint = '#e4d6af',
  service = false,
  van = false,
  night = false,
}: {
  car?: boolean;
  parked?: boolean;
  paint?: string;
  service?: boolean;
  van?: boolean;
  night?: boolean;
}) {
  const p = (x: number, y: number, z = 0) => {
    const [a, b] = service ? [y, x] : car ? [-x, -y] : [x, y];
    return `${0.866 * (a! - b!)},${0.5 * (a! + b!) - z}`;
  };
  const poly = (points: number[][]) => points.map(([x, y, z]) => p(x!, y!, z)).join(' ');
  const box = (
    x: number,
    y: number,
    w: number,
    d: number,
    z: number,
    h: number,
    roof: string,
    left: string,
    right: string,
  ) => (
    <>
      <polygon
        points={poly([
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={left}
      />
      <polygon
        points={poly([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ])}
        fill={right}
      />
      <polygon
        points={poly([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={roof}
        stroke="#73887b"
        strokeWidth=".4"
      />
    </>
  );
  // One ruler: a standing person is 18 world units (1.8 m). Vehicle bodies are measured
  // against it - car 44x18x15, van 56x22x22, service truck 60x20x24, freight 100x25x34.
  const half = car ? 22 : van ? 28 : service ? 30 : 50;
  const wide = car ? 9 : van ? 11 : service ? 10 : 12.5;
  const wheelZ = car ? 3 : 4;
  const wheelRx = car ? 3.4 : 3.8,
    wheelRy = car ? 4.4 : 5;
  const axles = car ? [-half + 9, half - 10] : [-half + 8, half - 19, half - 8];
  const bodyH = van ? 18 : service ? 20 : 26,
    cabH = van ? 14 : service ? 15 : 18;
  return (
    <g
      data-testid={
        parked
          ? 'parked-passenger-body'
          : car
            ? 'road-passenger-vehicle'
            : service
              ? 'road-site-service-vehicle'
              : 'road-freight-vehicle'
      }
    >
      <polygon
        points={poly([
          [-half - 2, -wide - 2, 0],
          [half + 4, -wide - 2, 0],
          [half + 4, wide + 2, 0],
          [-half - 2, wide + 2, 0],
        ])}
        fill="#1d3d33"
        opacity=".2"
      />
      {night && (
        <polygon
          data-testid={
            car
              ? 'road-car-headlights'
              : service
                ? 'service-truck-headlights'
                : 'road-truck-headlights'
          }
          points={poly([
            [half, -wide + 2, 1],
            [half + 70, -wide - 14, 0],
            [half + 70, wide + 14, 0],
            [half, wide - 2, 1],
          ])}
          fill="#ffe7aa"
          opacity=".2"
        />
      )}
      {axles.flatMap((x) =>
        [-wide + 2, wide - 2].map((y) => {
          const [cx, cy] = p(x, y, wheelZ).split(',');
          return (
            <g key={`${x}-${y}`}>
              <ellipse cx={cx} cy={cy} rx={wheelRx} ry={wheelRy} fill="#2c4545" />
              <ellipse cx={cx} cy={cy} rx={wheelRx * 0.42} ry={wheelRy * 0.47} fill="#9da99b" />
            </g>
          );
        }),
      )}
      {car ? (
        <>
          {box(-22, -9, 44, 18, 3, 7, paint, '#b8b994', '#94a38e')}
          {box(-9, -7, 18, 14, 10, 5, '#d9d8bb', '#536f75', '#496873')}
          <g data-testid="passenger-car-body-detail">
            <polyline
              points={poly([
                [2, 9, 3],
                [2, 9, 10],
              ])}
              stroke="#778e85"
              strokeWidth=".8"
            />
            <polyline
              points={poly([
                [-8, 9, 8],
                [-4, 9, 8],
              ])}
              stroke="#eef0da"
              strokeWidth=".8"
            />
            <polygon
              points={poly([
                [22, -8, 5],
                [22, 8, 5],
                [22, 8, 7],
                [22, -8, 7],
              ])}
              fill="#546b68"
            />
            {[-7, 5.5].map((y) => (
              <polygon
                key={y}
                points={poly([
                  [22, y, 8],
                  [22, y + 1.8, 8],
                  [22, y + 1.8, 9.5],
                  [22, y, 9.5],
                ])}
                fill="#f6e6bd"
              />
            ))}
            {[-7, 5.5].map((y) => (
              <polygon
                key={y}
                points={poly([
                  [-22, y, 5],
                  [-22, y + 1.8, 5],
                  [-22, y + 1.8, 6.5],
                  [-22, y, 6.5],
                ])}
                fill="#ac785d"
              />
            ))}
            <polyline
              points={poly([
                [9, -7, 10],
                [9, 7, 10],
              ])}
              stroke="#d9e0c9"
              strokeWidth=".8"
            />
          </g>
          <polyline
            points={poly([
              [-7, 0, 15],
              [7, 0, 15],
            ])}
            stroke="#f4edcc"
            strokeWidth=".8"
          />
        </>
      ) : (
        <>
          {box(-half, -wide, half * 2 - 16, wide * 2, 4, bodyH, '#e8eadc', '#acbcb0', '#8fa498')}
          {Array.from({ length: Math.floor((half * 2 - 28) / 8) }, (_, i) => -half + 6 + i * 8)
            .map((x) => (
              <polyline
                key={x}
                points={poly([
                  [x, wide, 5],
                  [x, wide, 4 + bodyH - 2],
                ])}
                stroke="#cbd4c6"
                strokeWidth=".8"
              />
            ))}
          {box(
            half - 15,
            -wide,
            15,
            wide * 2,
            4,
            cabH,
            van ? '#e1e3d2' : '#dfbc72',
            van ? '#bec9b8' : '#ba9555',
            van ? '#93a99d' : '#9c8e5e',
          )}
          <polygon
            points={poly([
              [half + 1, -wide + 2.5, 4 + cabH - 7],
              [half + 1, wide - 2.5, 4 + cabH - 7],
              [half + 1, wide - 2.5, 4 + cabH - 3],
              [half + 1, -wide + 2.5, 4 + cabH - 3],
            ])}
            fill="#436a73"
            stroke="#b6ccc0"
            strokeWidth=".5"
          />
          <polygon
            points={poly([
              [half - 11, wide, 4 + cabH - 7],
              [half - 4, wide, 4 + cabH - 7],
              [half - 4, wide, 4 + cabH - 3],
              [half - 11, wide, 4 + cabH - 3],
            ])}
            fill="#557b7b"
          />
          <polyline
            points={poly([
              [half + 1, -wide + 2, 5],
              [half + 1, wide - 2, 5],
            ])}
            stroke="#e0dbc1"
            strokeWidth="1"
          />
        </>
      )}
    </g>
  );
}

/** Ambient scenery only, never an implied paid order. Reduced-motion vehicles remain parked. */
export function WorldCampusTraffic({
  night,
  working,
  operating = false,
  reducedMotion,
  road,
  service,
}: {
  width: number;
  height: number;
  night: boolean;
  working: boolean;
  operating?: boolean;
  reducedMotion: boolean;
  road: WorldPoint[];
  service: WorldPoint[];
}) {
  const lane = (points: WorldPoint[], offset: number) => {
    const a = points[0]!,
      b = points[1]!,
      length = Math.hypot(b.x - a.x, b.y - a.y);
    return points.map((p) => ({
      x: p.x - ((b.y - a.y) / length) * offset,
      y: p.y + ((b.x - a.x) / length) * offset,
    }));
  };
  const freight = lane(road, 11),
    car = lane(road, -11).reverse(),
    site = lane(service.slice(0, 2), 10);
  const d = (points: WorldPoint[]) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const pose = (points: WorldPoint[], fraction: number) =>
    `translate(${points[0]!.x + (points[1]!.x - points[0]!.x) * fraction} ${points[0]!.y + (points[1]!.y - points[0]!.y) * fraction})`;
  return (
    <g data-testid="world-road-traffic">
      {/* Paint the far lane first so passing cars stay behind the nearer freight body. */}
      <g data-testid="ambient-car" transform={reducedMotion ? pose(car, 0.3) : undefined}>
        <RoadVehicle night={night} car />
        {!reducedMotion && (
          <animateMotion dur="29s" begin="-9s" repeatCount="indefinite" path={d(car)} />
        )}
      </g>
      <g data-testid="ambient-truck" transform={reducedMotion ? pose(freight, 0.4) : undefined}>
        <RoadVehicle night={night} />
        {!reducedMotion && (
          <animateMotion dur="38s" begin="-15s" repeatCount="indefinite" path={d(freight)} />
        )}
      </g>
      {(working || operating) && (
        <g data-testid={operating ? 'campus-service-traffic' : undefined}>
          <g
            data-testid="ambient-service-truck"
            transform={reducedMotion ? pose(site, 0.65) : undefined}
          >
            <g data-testid={operating ? 'service-van' : undefined}>
              <RoadVehicle night={night} service van={operating && !working} />
            </g>
            {!reducedMotion && (
              <animateMotion dur="45s" begin="-18s" repeatCount="indefinite" path={d(site)} />
            )}
          </g>
        </g>
      )}
    </g>
  );
}
