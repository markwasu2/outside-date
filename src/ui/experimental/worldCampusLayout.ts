export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface WorldPoint {
  x: number;
  y: number;
}
/** Same orthographic ground camera as campus-art.py: x/y ground, z upright. */
export function worldCampusLayout(count: number) {
  const columns = count > 3 ? Math.ceil(count / 2) : Math.max(1, count),
    rows = count > 3 ? 2 : 1;
  const right = columns * 210 + 160,
    bottom = Math.max(275, rows * 180 - 30);
  const minX = (-260 - bottom) * 0.866 - 50,
    minY = -220;
  const width = (columns * 210 + 65 + 240 + 170) * 0.866 - minX + 70,
    height = (right + bottom) * 0.5 - minY + 65;
  const project = (x: number, y: number, z = 0): WorldPoint => ({
    x: (x - y) * 0.866 - minX,
    y: (x + y) * 0.5 - z - minY,
  });
  const sprite = (x: number, y: number, size = 300): WorldRect => {
    const p = project(x, y);
    return {
      x: p.x - (size * 145) / 300,
      y: p.y - (size * 138) / 300,
      width: size,
      height: (size * 242) / 300,
    };
  };
  const utilityWorldX = columns * 210 + 65;
  return {
    width,
    height,
    columns,
    rows,
    right,
    bottom,
    project,
    sprite,
    utilityWorldX,
    powerPoleAnchors: (count: number) => {
      // Keep upright poles on the north verge, clear of the substation/reserve.
      // Existing 100-unit spacing stays unless a small campus needs a shorter row.
      const last = Math.min(80 + (count - 1) * 100, utilityWorldX - 90);
      const first = Math.max(-40, last - (count - 1) * 100);
      return Array.from({ length: count }, (_, i) => ({
        x: count === 1 ? 80 : first + (i * (last - first)) / (count - 1),
        y: -158,
      }));
    },
    // Upright trees sit outside both the roads and the reserved power-plant pad.
    perimeterTrees: [
      ...Array.from({ length: Math.ceil((right + 200) / 80) }, (_, i) => ({
        x: -200 + i * 80,
        y: bottom + 50,
      })),
      ...Array.from({ length: Math.ceil((bottom + 250) / 85) }, (_, i) => ({
        x: right + 65,
        y: -160 + i * 85,
      })).filter((q) => q.y >= 10),
      ...Array.from({ length: Math.ceil((right + 100) / 100) }, (_, i) => ({
        x: -100 + i * 100,
        y: -200,
      })),
    ],
    halls: Array.from({ length: count }, (_, i) =>
      sprite((i % columns) * 210, Math.floor(i / columns) * 180),
    ),
    office: sprite(-205, 10, 160),
    field: sprite(-205, 155, 100),
    people: sprite(-205, 245, 80),
    substation: sprite(utilityWorldX, -150, 130),
    cooling: sprite(utilityWorldX, -5, 180),
    backup: sprite(utilityWorldX, 175, 180),
    plantSlots: [sprite(utilityWorldX + 130, -170, 100), sprite(utilityWorldX + 240, -170, 100)],
    deliveries: sprite(utilityWorldX, -70, 120),
    utilityX: project(utilityWorldX, 0).x,
  };
}
