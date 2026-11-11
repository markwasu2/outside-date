import type {GameState,Hall} from '../../engine/types';

/** Active is an outstanding order, not proof that this month's crews can move. */
export function activeWorkWords(state:GameState,hall:Hall):string|null{
 if(hall.terminated)return 'The tenant left this data center. It will not finish or earn rent.';
 if(hall.delivered)return 'This data center is open. Rent and running costs update each month.';
 if(!hall.stageActive)return null;
 if(state.flags.outOfBalance)return 'Work is paused because the lender found a gap between the remaining build and committed funding. Review Money for financing options; clearing paperwork alone cannot restart work.';
 if(state.flags.drawFreeze)return 'Work is paused by the lender funding freeze. Clear the paperwork before advancing time; waiting alone will not fix it.';
 if(state.flags[`inspectionFail:${hall.id}`])return 'Work is paused after a failed inspection. Repair the inspection before advancing time; waiting alone will not fix it.';
 if(hall.pausedThisMonth)return 'You stood this crew down for one month. This month adds no construction progress; work resumes after the pause.';
 return 'Building in progress. Advance the month to let crews work. No repeat order needed. If progress does not move, check the last month report and funding.';
}
