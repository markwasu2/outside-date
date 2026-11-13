import { describe, it, expect } from 'vitest';
import { resultCampusLayout } from './resultCampusLayout';
import { worldCampusLayout } from '../experimental/worldCampusLayout';
describe('closing physical camera', () => {
  it('fits every hall without changing its authored proportions or live arrangement', () => {
    for (let count = 1; count <= 6; count++) {
      const l = resultCampusLayout(count),
        live = worldCampusLayout(count);
      expect(l.columns).toBe(live.columns);
      expect(l.rows).toBe(live.rows);
      for (const h of l.halls) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.x + h.width).toBeLessThanOrEqual(900);
        expect(h.y + h.height).toBeLessThanOrEqual(600);
        expect(h.width / h.height).toBeCloseTo(300 / 242);
      }
      for (let i = 1; i < count; i++) {
        expect((l.halls[i]!.x - l.halls[0]!.x) / l.scale).toBeCloseTo(
          live.halls[i]!.x - live.halls[0]!.x,
        );
        expect((l.halls[i]!.y - l.halls[0]!.y) / l.scale).toBeCloseTo(
          live.halls[i]!.y - live.halls[0]!.y,
        );
      }
    }
  });
  it('keeps ground and upright axes identical to the hall art', () => {
    const l = resultCampusLayout(6),
      o = l.project(0, 0),
      x = l.project(100, 0),
      y = l.project(0, 100),
      z = l.project(0, 0, 100);
    expect((x.x - o.x) / l.scale).toBeCloseTo(86.6);
    expect((y.x - o.x) / l.scale).toBeCloseTo(-86.6);
    expect((x.y - o.y) / l.scale).toBeCloseTo(50);
    expect((y.y - o.y) / l.scale).toBeCloseTo(50);
    expect((z.y - o.y) / l.scale).toBeCloseTo(-100);
  });
});
