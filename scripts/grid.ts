import { loadContent } from '../src/content/load';
import { BOTS, runOneGame } from '../src/sim/runSim';
import { aggregate } from '../src/sim/report';

const RUNS = 1000;
const SEED = 1;
const content = loadContent();
const scenario = process.argv[2] ?? 'whale';

console.log(`grid: ${scenario}, ${RUNS} seeds from ${SEED}`);
console.log('bot,difficulty,winRate,medianMultiple,medianFirstDelivery');
for (const botId of Object.keys(BOTS)) {
  const bot = BOTS[botId]!;
  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const results = Array.from({ length: RUNS }, (_, i) => runOneGame(bot, content, scenario, difficulty, SEED + i));
    const r = aggregate(results);
    console.log(
      `${botId},${difficulty},${(r.winRate * 100).toFixed(1)},${r.equityMultiple.median?.toFixed(2) ?? 'null'},${r.firstDeliveryMonth.median ?? 'null'}`,
    );
  }
}
