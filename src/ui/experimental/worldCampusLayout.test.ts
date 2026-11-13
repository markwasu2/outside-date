import { describe, it, expect } from 'vitest';
import { worldCampusLayout } from './worldCampusLayout';
describe('shared isometric world camera', () => {
  it('keeps physical art dimensions independent of hall count', () => {
    const single = worldCampusLayout(1);
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const l = worldCampusLayout(count);
      expect(l.halls).toHaveLength(count);
      for (const r of [...l.halls, l.office, l.substation, l.cooling, l.backup]) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.width).toBeLessThan(l.width);
        expect(r.y + r.height).toBeLessThan(l.height);
      }
      for (const h of l.halls) {
        expect(h.width).toBe(single.halls[0]!.width);
        expect(h.height).toBe(single.halls[0]!.height);
      }
      for (const key of ['office', 'substation', 'cooling', 'backup'] as const) {
        expect(l[key].width).toBe(single[key].width);
        expect(l[key].height).toBe(single[key].height);
      }
    }
  });
  it.each([1, 2, 3, 4, 5, 6])(
    'contains backup yard inside the owned perimeter for %i halls',
    (count) => {
      const l = worldCampusLayout(count);
      expect(l.bottom).toBeGreaterThanOrEqual(265);
      expect(l.utilityWorldX + 65).toBeLessThan(l.right);
      expect(l.halls[0]!.width).toBe(300);
    },
  );
  it.each([1, 2, 3, 4, 5, 6])('keeps tree roots out of the plant reserve for %i halls', (count) => {
    const l = worldCampusLayout(count);
    const pad = {
      left: l.utilityWorldX - 50,
      right: l.utilityWorldX + 300,
      top: -190,
      bottom: -90,
    };
    expect(l.perimeterTrees.length).toBeGreaterThan(10);
    for (const q of l.perimeterTrees) {
      expect(q.x >= pad.left && q.x <= pad.right && q.y >= pad.top && q.y <= pad.bottom).toBe(
        false,
      );
    }
    expect(l.perimeterTrees.filter((q) => q.x === l.right + 65).every((q) => q.y >= 10)).toBe(true);
  });
  it('uses exactly the building art camera for ground edges without distorting upright height', () => {
    const l = worldCampusLayout(6),
      o = l.project(0, 0),
      x = l.project(100, 0),
      y = l.project(0, 100),
      z = l.project(0, 0, 100);
    expect(x.x - o.x).toBeCloseTo(86.6);
    expect(x.y - o.y).toBeCloseTo(50);
    expect(y.x - o.x).toBeCloseTo(-86.6);
    expect(y.y - o.y).toBeCloseTo(50);
    expect(z.x).toBe(o.x);
    expect(z.y - o.y).toBe(-100);
    expect(l.halls[1]!.x - l.halls[0]!.x).toBeCloseTo(210 * 0.866);
    expect(l.halls[3]!.y - l.halls[0]!.y).toBeCloseTo(90);
  });
});
