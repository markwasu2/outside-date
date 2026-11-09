import { loadContent } from '../src/content/load';
import { BOTS, runOneGame } from '../src/sim/runSim';
import { aggregate } from '../src/sim/report';

const RUNS = 1000;
const SEED = 1;
const content = loadContent();
const scenario = process.argv[2] ?? 'whale';
const difficulty = (process.argv[3] ?? 'normal') as 'easy' | 'normal' | 'hard';

const sites = (content.sites[scenario] ?? []).map((s) => s.id);
console.log(`site grid: ${scenario} ${difficulty}, ${RUNS} seeds, sites: ${sites.join(', ')}`);
console.log('bot,site,winRate,medianMultiple,medianFirstDelivery');
for (const botId of ['greedy', 'careful', 'competent']) {
  const base = BOTS[botId]!;
  for (const site of sites) {
    const bot = { ...base, setup: { ...base.setup, site }, pickSite: undefined };
    const results = Array.from({ length: RUNS }, (_, i) => runOneGame(bot, content, scenario, difficulty, SEED + i));
    const r = aggregate(results);
    console.log(
      `${botId},${site},${(r.winRate * 100).toFixed(1)},${r.equityMultiple.median?.toFixed(2) ?? 'null'},${r.firstDeliveryMonth.median ?? 'null'}`,
    );
  }
}
