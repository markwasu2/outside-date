export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** Physical dimensions do not depend on hall count. Only the site's extent grows. */
export function worldCampusLayout(count: number) {
  const columns = count > 3 ? Math.ceil(count / 2) : Math.max(1, count),
    rows = count > 3 ? 2 : 1;
  const width = columns * 310 + 480,
    height = Math.max(630, rows * 250 + 190),
    utilityX = columns * 310 + 220;
  return {
    width,
    height,
    columns,
    rows,
    utilityX,
    halls: Array.from({ length: count }, (_, i) => ({
      x: 155 + (i % columns) * 310,
      y: 101 + Math.floor(i / columns) * 250,
      width: 300,
      height: 242,
    })),
    office: { x: -20, y: 75, width: 160, height: 129 },
    substation: { x: utilityX + 190, y: 100, width: 100, height: 81 },
    cooling: { x: utilityX - 15, y: 150, width: 180, height: 145 },
    backup: { x: utilityX - 15, y: height - 265, width: 180, height: 145 },
  };
}
