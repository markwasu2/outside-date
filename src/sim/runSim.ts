import { loadContent } from '../content/load';
import type { Content } from '../content/schemas';
import { applyAction } from '../engine/actions';
import { createGame, type DifficultyId } from '../engine/init';
import { resolveEvent, step } from '../engine/step';
import type { GameState } from '../engine/types';
import { carefulBot } from './bots/careful';
import { competentBot } from './bots/competent';
import { greedyBot } from './bots/greedy';
import { randomBot } from './bots/random';
import type { Bot } from './bots/shared';
import { aggregate, formatReport, type RunResult } from './report';
import { BotRng } from './rng';

export const BOTS: Record<string, Bot> = {
  random: randomBot,
  greedy: greedyBot,
  careful: carefulBot,
  competent: competentBot,
};

const DIFFICULTY_IDS: DifficultyId[] = ['easy', 'normal', 'hard'];

interface CliArgs {
  bot: string;
  runs: number;
  seed: number;
  scenario: string;
  difficulty: DifficultyId;
  json: boolean;
  /** Phase 4: force a site id (overrides the bot's pickSite policy), for per-site grid runs. */
  site?: string;
}

/** Minimal `--key value` / `--flag` parser (P5.2); no CLI-parsing library is a dependency yet. */
function parseArgs(argv: string[]): CliArgs {
  const opts: Record<string, string> = {};
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`Missing value for --${key}`);
      opts[key] = value;
      i += 1;
    }
  }
  const difficulty = (opts.difficulty ?? 'normal') as DifficultyId;
  if (!DIFFICULTY_IDS.includes(difficulty)) {
    throw new Error(`Unknown difficulty "${difficulty}". Expected one of: ${DIFFICULTY_IDS.join(', ')}`);
  }
  return {
    bot: opts.bot ?? 'competent',
    runs: Number(opts.runs ?? 100),
    seed: Number(opts.seed ?? 1),
    scenario: opts.scenario ?? 'whale',
    difficulty,
    json,
    site: opts.site,
  };
}

/**
 * Plays one seed to completion (P5.2, factored out for P10.5 so `src/ui/store.ts`'s debug hook
 * can reuse the exact same loop a Playwright smoke test drives through the UI, rather than a
 * second copy): steps months while `playing`, resolves the bot's event choice while
 * `awaitingChoice` (looped in case a resolution itself pauses again mid-tick, e.g. a second
 * docket vote failing in the same world tick), then immediately prices the takeout the moment the
 * window opens - `step()` throws once `phase` leaves `'playing'`, so a bot that never calls
 * `priceTakeout` would otherwise hang forever (P5.1/P5.2 Decisions log).
 */
export function playOneGame(
  bot: Bot,
  content: Content,
  scenarioId: string,
  difficulty: DifficultyId,
  seed: number,
  onMonth?: (state: GameState) => void,
): { state: GameState; lastEventTitle: string | null } {
  const rng = new BotRng(seed);
  // Phase 4 (pillar A): the bot's site policy picks the ground; without one, the fixed
  // `setup.site` stands (pinned setups like the tutorial balance sim).
  const setup = bot.pickSite ? { ...bot.setup, site: bot.pickSite(content, scenarioId, rng) } : bot.setup;
  let state = createGame(content, scenarioId, setup, bot.negotiation, seed, difficulty);
  let lastEventTitle: string | null = null;
  let guard = 0;
  const maxIterations = state.maxMonths * 4 + 200;

  while (state.phase === 'playing') {
    guard += 1;
    if (guard > maxIterations) throw new Error(`playOneGame: exceeded iteration guard (seed ${seed})`);

    onMonth?.(state);
    const actions = bot.chooseActions(state, content, rng);
    const logLenBefore = state.log.length;
    const result = step(state, actions, content);
    state = result.state;
    const newEvent = state.log.slice(logLenBefore).find((e) => e.kind === 'event');
    if (newEvent) lastEventTitle = newEvent.text;

    while (state.phase === 'awaitingChoice' && state.pending) {
      const choiceId = bot.chooseEvent(state, state.pending, rng);
      const resolved = resolveEvent(state, choiceId, content);
      state = resolved.state;
    }
  }

  if (state.phase === 'takeoutAvailable') {
    state = applyAction(state, { actionId: 'priceTakeout' }, content);
  }

  return { state, lastEventTitle };
}

/** Runs one seed to completion and reduces it to the summary `RunResult` the CLI/balance test
 * report on (the raw final `GameState` is `playOneGame`'s own return, for callers that need it). */
export function runOneGame(bot: Bot, content: Content, scenarioId: string, difficulty: DifficultyId, seed: number): RunResult {
  const { state, lastEventTitle } = playOneGame(bot, content, scenarioId, difficulty, seed);
  if (!state.outcome) throw new Error(`runOneGame: ended without an outcome (seed ${seed})`);

  const deliveredMonths = state.halls.map((h) => h.deliveredMonth).filter((m): m is number => m !== null);
  const ldPaid = state.halls.reduce((sum, h) => sum + h.ldPaid, 0);

  return {
    seed,
    outcome: state.outcome,
    equityMultiple: state.takeout?.equityMultiple ?? null,
    firstDeliveryMonth: deliveredMonths.length > 0 ? Math.min(...deliveredMonths) : null,
    ldPaid,
    reportCard: state.takeout?.reportCard ?? null,
    docketFailedFirstVote: state.docket.failCount >= 1,
    lastEventTitle,
  };
}

// `nodeProcess()` indirection: this module is bundled into the browser build via store.ts, and
// the project has no @types/node, so a bare `process` reference breaks both tsc and the browser.
function nodeProcess(): { argv: string[] } | undefined {
  return (globalThis as { process?: { argv: string[] } }).process;
}

function main(): void {
  const args = parseArgs((nodeProcess()?.argv ?? []).slice(2));
  const base = BOTS[args.bot];
  if (!base) throw new Error(`Unknown bot "${args.bot}". Known bots: ${Object.keys(BOTS).join(', ')}`);
  const bot: Bot = args.site
    ? { ...base, setup: { ...base.setup, site: args.site }, pickSite: undefined }
    : base;

  const content = loadContent();
  if (!content.scenarios[args.scenario]) {
    throw new Error(`Unknown scenario "${args.scenario}". Known scenarios: ${Object.keys(content.scenarios).join(', ')}`);
  }

  const results: RunResult[] = [];
  for (let i = 0; i < args.runs; i += 1) {
    results.push(runOneGame(bot, content, args.scenario, args.difficulty, args.seed + i));
  }

  const report = aggregate(results);
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReport(bot.id, report));
  }
}

// Bug fix (found building P10.5's debug hook): this module is now also imported by
// `src/ui/store.ts` for its `BOTS`/`playOneGame` exports, so it ends up in the browser bundle -
// `typeof process !== 'undefined'` short-circuits before touching `process.argv`, which doesn't
// exist in a browser and would otherwise throw a `ReferenceError` on every page load (crashing
// the whole app, since `main()` itself is never meant to run outside the Node CLI anyway).
if (nodeProcess() && import.meta.url === `file://${nodeProcess()!.argv[1]}`) {
  main();
}
