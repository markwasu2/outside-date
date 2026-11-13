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
  const half = car ? 12 : van ? 16 : service ? 17 : 25;
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
          [-half - 1, -8, 0],
          [half + 3, -8, 0],
          [half + 3, 10, 0],
          [-half - 1, 10, 0],
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
            [half, -5, 1],
            [half + 50, -15, 0],
            [half + 50, 15, 0],
            [half, 5, 1],
          ])}
          fill="#ffe7aa"
          opacity=".2"
        />
      )}
      {[-half + 5, half - 6].flatMap((x) =>
        [-6, 6].map((y) => {
          const [cx, cy] = p(x, y, 3).split(',');
          return (
            <g key={`${x}-${y}`}>
              <ellipse cx={cx} cy={cy} rx="2.4" ry="3.2" fill="#2c4545" />
              <ellipse cx={cx} cy={cy} rx="1" ry="1.5" fill="#9da99b" />
            </g>
          );
        }),
      )}
      {car ? (
        <>
          {box(-12, -5, 24, 10, 3, 4, paint, '#b8b994', '#94a38e')}
          {box(-5, -4, 10, 8, 7, 4, '#d9d8bb', '#536f75', '#496873')}
          <g data-testid="passenger-car-body-detail">
            <polyline
              points={poly([
                [0, 5, 3],
                [0, 5, 7],
              ])}
              stroke="#778e85"
              strokeWidth=".6"
            />
            <polyline
              points={poly([
                [-4, 5, 6],
                [-2, 5, 6],
              ])}
              stroke="#eef0da"
              strokeWidth=".65"
            />
            <polygon
              points={poly([
                [12, -4, 4.5],
                [12, 4, 4.5],
                [12, 4, 5.5],
                [12, -4, 5.5],
              ])}
              fill="#546b68"
            />
            {[-4, 3].map((y) => (
              <polygon
                key={y}
                points={poly([
                  [12, y, 5.8],
                  [12, y + 1.3, 5.8],
                  [12, y + 1.3, 6.8],
                  [12, y, 6.8],
                ])}
                fill="#f6e6bd"
              />
            ))}
            {[-4, 3].map((y) => (
              <polygon
                key={y}
                points={poly([
                  [-12, y, 4.5],
                  [-12, y + 1.3, 4.5],
                  [-12, y + 1.3, 6],
                  [-12, y, 6],
                ])}
                fill="#ac785d"
              />
            ))}
            <polyline
              points={poly([
                [5, -4, 7],
                [5, 4, 7],
              ])}
              stroke="#d9e0c9"
              strokeWidth=".65"
            />
          </g>
          <polyline
            points={poly([
              [-4, 0, 11],
              [4, 0, 11],
            ])}
            stroke="#f4edcc"
            strokeWidth=".6"
          />
        </>
      ) : (
        <>
          {box(-half, -6, half * 2 - 13, 12, 4, 12, '#e8eadc', '#acbcb0', '#8fa498')}
          {[-half + 4, -half + 9, -half + 14, -half + 19]
            .filter((x) => x < half - 13)
            .map((x) => (
              <polyline
                key={x}
                points={poly([
                  [x, 6, 5],
                  [x, 6, 15],
                ])}
                stroke="#cbd4c6"
                strokeWidth=".7"
              />
            ))}
          {box(
            half - 11,
            -6,
            12,
            12,
            4,
            9,
            van ? '#e1e3d2' : '#dfbc72',
            van ? '#bec9b8' : '#ba9555',
            van ? '#93a99d' : '#9c8e5e',
          )}
          <polygon
            points={poly([
              [half + 1, -4.8, 9],
              [half + 1, 4.8, 9],
              [half + 1, 4.8, 12],
              [half + 1, -4.8, 12],
            ])}
            fill="#436a73"
            stroke="#b6ccc0"
            strokeWidth=".4"
          />
          <polygon
            points={poly([
              [half - 9, 6, 8],
              [half - 3, 6, 8],
              [half - 3, 6, 12],
              [half - 9, 6, 12],
            ])}
            fill="#557b7b"
          />
          <polyline
            points={poly([
              [half + 1, -5, 5],
              [half + 1, 5, 5],
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
  const freight = lane(road, 5),
    car = lane(road, -5).reverse(),
    site = lane(service.slice(0, 2), 4);
  const d = (points: WorldPoint[]) =>
    points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const pose = (points: WorldPoint[], fraction: number) =>
    `translate(${points[0]!.x + (points[1]!.x - points[0]!.x) * fraction} ${points[0]!.y + (points[1]!.y - points[0]!.y) * fraction})`;
  return (
    <g data-testid="world-road-traffic">
      <g data-testid="ambient-truck" transform={reducedMotion ? pose(freight, 0.4) : undefined}>
        <RoadVehicle night={night} />
        {!reducedMotion && (
          <animateMotion dur="38s" begin="-15s" repeatCount="indefinite" path={d(freight)} />
        )}
      </g>
      <g data-testid="ambient-car" transform={reducedMotion ? pose(car, 0.3) : undefined}>
        <RoadVehicle night={night} car />
        {!reducedMotion && (
          <animateMotion dur="29s" begin="-9s" repeatCount="indefinite" path={d(car)} />
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
