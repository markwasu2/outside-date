/** Compact closing camera uses the same ground axes and sprite anchors as the live campus.
 * Only the crop changes: the complete closing position fits a 3:2 illustration. */
export function resultCampusLayout(count: number) {
  const columns = count > 3 ? Math.ceil(count / 2) : Math.max(1, count),
    rows = Math.ceil(count / columns);
  const raw = (x: number, y: number, z = 0) => ({ x: 0.866 * (x - y), y: 0.5 * (x + y) - z });
  const anchors = Array.from({ length: count }, (_, i) => ({
    x: (i % columns) * 210,
    y: Math.floor(i / columns) * 180,
  }));
  const points = anchors.flatMap(({ x, y }) => {
    const p = raw(x, y);
    return [
      { x: p.x - 160, y: p.y - 155 },
      { x: p.x + 175, y: p.y + 140 },
    ];
  });
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y));
  const scale = Math.min(850 / (maxX - minX), 550 / (maxY - minY));
  const offsetX = (900 - (maxX - minX) * scale) / 2 - minX * scale,
    offsetY = (600 - (maxY - minY) * scale) / 2 - minY * scale;
  const project = (x: number, y: number, z = 0) => {
    const p = raw(x, y, z);
    return { x: p.x * scale + offsetX, y: p.y * scale + offsetY };
  };
  return {
    columns,
    rows,
    project,
    scale,
    halls: anchors.map(({ x, y }) => {
      const p = project(x, y);
      return {
        x: p.x - 145 * scale,
        y: p.y - 138 * scale,
        width: 300 * scale,
        height: 242 * scale,
      };
    }),
    anchors,
  };
}
