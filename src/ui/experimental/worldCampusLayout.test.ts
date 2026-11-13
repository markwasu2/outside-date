import { describe, it, expect } from 'vitest';
import { worldCampusLayout } from './worldCampusLayout';
describe('shared world coordinate layout', () => {
  it('keeps every physical building size unchanged while site extent grows', () => {
    const single = worldCampusLayout(1);
    for (const count of [2, 3, 4, 5, 6]) {
      const site = worldCampusLayout(count);
      expect(site.halls).toHaveLength(count);
      for (const hall of site.halls) {
        expect(hall.width).toBe(single.halls[0]!.width);
        expect(hall.height).toBe(single.halls[0]!.height);
        expect(hall.x).toBeGreaterThan(120);
        expect(hall.x + hall.width).toBeLessThan(site.utilityX - 15);
        expect(hall.y + hall.height).toBeLessThan(site.height - 75);
      }
      for (const key of ['office', 'substation', 'cooling', 'backup'] as const) {
        expect(site[key].width).toBe(single[key].width);
        expect(site[key].height).toBe(single[key].height);
      }
    }
  });
  it('leaves a service aisle between the two hall rows without intersecting utility buildings', () => {
    const site = worldCampusLayout(6);
    expect(site.halls[3]!.y - site.halls[0]!.y).toBe(250);
    expect(site.cooling.y + site.cooling.height).toBeLessThan(site.backup.y);
    for (const hall of site.halls) expect(hall.x + hall.width).toBeLessThan(site.cooling.x);
  });
});
