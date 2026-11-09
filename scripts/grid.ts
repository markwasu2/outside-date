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
console.log('| bot | diff | win% | medMult | brRisk% | dsu% | stormsPer | firesPer | smallPer | levers | loseReasons |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const diff of diffs) {
  for (const id of botIds) {
    const bot = BOTS[id]!;
    let wins = 0, br = 0, dsu = 0, storms = 0, fires = 0, small = 0, levers = 0;
    const mults: number[] = [];
    const lose: Record<string, number> = {};
    for (let i = 0; i < runs; i += 1) {
      const { state } = playOneGame(bot, content, 'whale', diff, 1 + i);
      const m = state.takeout?.equityMultiple ?? null;
      if (state.outcome?.kind === 'win' && (m ?? 0) >= 1) wins += 1;
      if (state.outcome?.kind === 'lose') lose[state.outcome.reason] = (lose[state.outcome.reason] ?? 0) + 1;
      if (m !== null) mults.push(m);
      if (state.insurance.buildersRisk) br += 1;
      if (state.insurance.dsu) dsu += 1;
      for (const e of state.log) {
        if (e.kind !== 'event') continue;
        if (/storm/i.test(e.text)) storms += 1;
        else if (/fire/i.test(e.text)) fires += 1;
        else if (/water|theft|leak|break-in/i.test(e.text)) small += 1;
        if (/bridge|capital call|equity cure|mezz top|scope-down|recap/i.test(e.text)) levers += 1;
      }
      for (const e of state.log) if (e.kind === 'action' && /bridge|capital call|cure|top-up|scope|recap/i.test(e.text)) levers += 1;
    }
    const f = (x: number) => (x / runs).toFixed(2);
    console.log(`| ${id} | ${diff} | ${(wins / runs * 100).toFixed(1)} | ${med(mults).toFixed(2)} | ${(br / runs * 100).toFixed(0)} | ${(dsu / runs * 100).toFixed(0)} | ${f(storms)} | ${f(fires)} | ${f(small)} | ${f(levers)} | ${JSON.stringify(lose)} |`);
  }
}
