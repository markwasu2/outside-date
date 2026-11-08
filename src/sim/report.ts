import type { Grade, Outcome } from '../engine/types';

/** One completed run's summary, produced by `runSim.ts`'s `runOneGame`. */
export interface RunResult {
  seed: number;
  outcome: Outcome;
  equityMultiple: number | null;
  firstDeliveryMonth: number | null;
  ldPaid: number;
  reportCard: Record<'time' | 'cost' | 'riskAllocation' | 'community' | 'value', Grade> | null;
  docketFailedFirstVote: boolean;
  lastEventTitle: string | null;
}

export interface Report {
  runs: number;
  winRate: number;
  loseReasonCounts: Record<string, number>;
  equityMultiple: { median: number; p10: number; p90: number };
  firstDeliveryMonth: { median: number | null };
  ldPaid: { median: number; shareWithAnyLd: number };
  docketFailedFirstVoteRate: number;
  averageGrades: Record<'time' | 'cost' | 'riskAllocation' | 'community' | 'value', number>;
  topEventsPrecedingLosses: { title: string; count: number }[];
}

const GRADE_POINTS: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[idx]!;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return quantile(sorted, 0.5);
}

/** Aggregates a batch of runs into the summary stats PLAN.md's P5.2 asks `runSim.ts` to print. */
export function aggregate(results: RunResult[]): Report {
  const runs = results.length;
  const wins = results.filter((r) => r.outcome.kind === 'win' && (r.equityMultiple ?? 0) >= 1.0).length;

  const loseReasonCounts: Record<string, number> = {};
  for (const r of results) {
    if (r.outcome.kind === 'lose') {
      loseReasonCounts[r.outcome.reason] = (loseReasonCounts[r.outcome.reason] ?? 0) + 1;
    }
  }

  const multiples = results.map((r) => r.equityMultiple).filter((m): m is number => m !== null);
  const sortedMultiples = [...multiples].sort((a, b) => a - b);

  const deliveryMonths = results
    .map((r) => r.firstDeliveryMonth)
    .filter((m): m is number => m !== null);

  const ldValues = results.map((r) => r.ldPaid);
  const shareWithAnyLd = runs > 0 ? ldValues.filter((v) => v > 0).length / runs : 0;

  const docketFailedFirstVoteRate = runs > 0 ? results.filter((r) => r.docketFailedFirstVote).length / runs : 0;

  const gradeAxes: (keyof Report['averageGrades'])[] = ['time', 'cost', 'riskAllocation', 'community', 'value'];
  const averageGrades = {} as Report['averageGrades'];
  for (const axis of gradeAxes) {
    const points = results.map((r) => r.reportCard?.[axis]).filter((g): g is Grade => g !== undefined);
    averageGrades[axis] = points.length > 0 ? points.reduce((sum, g) => sum + GRADE_POINTS[g], 0) / points.length : 0;
  }

  const eventCounts: Record<string, number> = {};
  for (const r of results) {
    if (r.outcome.kind === 'lose' && r.lastEventTitle) {
      eventCounts[r.lastEventTitle] = (eventCounts[r.lastEventTitle] ?? 0) + 1;
    }
  }
  const topEventsPrecedingLosses = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  return {
    runs,
    winRate: runs > 0 ? wins / runs : 0,
    loseReasonCounts,
    equityMultiple: {
      median: median(multiples),
      p10: quantile(sortedMultiples, 0.1),
      p90: quantile(sortedMultiples, 0.9),
    },
    firstDeliveryMonth: { median: deliveryMonths.length > 0 ? median(deliveryMonths) : null },
    ldPaid: { median: median(ldValues), shareWithAnyLd },
    docketFailedFirstVoteRate,
    averageGrades,
    topEventsPrecedingLosses,
  };
}

/** Human-readable rendering of a `Report` for the CLI's default (non-`--json`) output. */
export function formatReport(botId: string, report: Report): string {
  const lines: string[] = [];
  lines.push(`Bot: ${botId} (${report.runs} runs)`);
  lines.push(`Win rate: ${(report.winRate * 100).toFixed(1)}%`);
  lines.push(
    `Lose reasons: ${
      Object.entries(report.loseReasonCounts)
        .map(([reason, count]) => `${reason}=${count}`)
        .join(', ') || '(none)'
    }`,
  );
  lines.push(
    `Equity multiple: median ${report.equityMultiple.median.toFixed(2)}x, p10 ${report.equityMultiple.p10.toFixed(2)}x, p90 ${report.equityMultiple.p90.toFixed(2)}x`,
  );
  lines.push(
    `Median month of first delivery: ${report.firstDeliveryMonth.median === null ? 'n/a' : report.firstDeliveryMonth.median}`,
  );
  lines.push(
    `LD paid: median $${report.ldPaid.median.toLocaleString()}, ${(report.ldPaid.shareWithAnyLd * 100).toFixed(1)}% of runs paid some`,
  );
  lines.push(`Docket failed the first vote in ${(report.docketFailedFirstVoteRate * 100).toFixed(1)}% of runs`);
  lines.push(
    `Average report card (0-4 GPA scale): ${Object.entries(report.averageGrades)
      .map(([axis, points]) => `${axis}=${points.toFixed(2)}`)
      .join(', ')}`,
  );
  lines.push(
    `Top events preceding losses: ${
      report.topEventsPrecedingLosses.map((e) => `${e.title} (${e.count})`).join(', ') || '(none)'
    }`,
  );
  return lines.join('\n');
}
