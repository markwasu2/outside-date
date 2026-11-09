import { loadContent } from '../src/content/load';
import { BOTS, playOneGame } from '../src/sim/runSim';
import type { DifficultyId } from '../src/engine/init';

/** Phase 3 grid runner: every bot x every difficulty, N seeds, plus insurance/hazard stats.
 * Usage: npx tsx scripts/grid.ts [runs] [bot,bot] [difficulty,difficulty] */
const runs = Number(process.argv[2] ?? 1000);
const botIds = (process.argv[3] ?? 'random,greedy,careful,competent').split(',');
const diffs = (process.argv[4] ?? 'easy,normal,hard').split(',') as DifficultyId[];
const content = loadContent();

function med(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)]! : 0;
}
console.log('| bot | diff | win% | medMult | brMonths% | dsuMonths% | stormsPer | firesPer | smallPer | leverUsesPer | paidPer($M) | loseReasons |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const diff of diffs) {
  for (const id of botIds) {
    const bot = BOTS[id]!;
    let wins = 0, brMonths = 0, dsuMonths = 0, buildMonths = 0, storms = 0, fires = 0, small = 0, levers = 0, paid = 0;
    const mults: number[] = [];
    const lose: Record<string, number> = {};
    for (let i = 0; i < runs; i += 1) {
      const { state } = playOneGame(bot, content, 'whale', diff, 1 + i, (s) => {
        if (s.halls.some((h) => h.stageActive && !h.delivered && !h.terminated)) {
          buildMonths += 1;
          if (s.insurance.buildersRisk) brMonths += 1;
          if (s.insurance.dsu) dsuMonths += 1;
        }
      });
      const m = state.takeout?.equityMultiple ?? null;
      if (state.outcome?.kind === 'win' && (m ?? 0) >= 1) wins += 1;
      if (state.outcome?.kind === 'lose') lose[state.outcome.reason] = (lose[state.outcome.reason] ?? 0) + 1;
      if (m !== null) mults.push(m);
      for (const c of state.claims) {
        paid += c.paid;
        if (c.kind === 'storm') storms += 1;
        else if (c.kind === 'fire') fires += 1;
        else small += 1;
      }
      levers += state.capital.log.length;
    }
    const pct = (x: number) => (buildMonths ? ((x / buildMonths) * 100).toFixed(0) : '0');
    const f = (x: number) => (x / runs).toFixed(2);
    console.log(`| ${id} | ${diff} | ${(wins / runs * 100).toFixed(1)} | ${med(mults).toFixed(2)} | ${pct(brMonths)} | ${pct(dsuMonths)} | ${f(storms)} | ${f(fires)} | ${f(small)} | ${f(levers)} | ${(paid / runs / 1e6).toFixed(1)} | ${JSON.stringify(lose)} |`);
  }
}
