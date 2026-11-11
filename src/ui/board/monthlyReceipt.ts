import type {Content} from '../../content/schemas';
import type {MonthReview} from './monthReview';
import {developments} from './monthReview';
import {campusMilestones} from './campusMilestones';

/** Only the finished month's frozen states feed this receipt, never today's draft. */
export function monthlyReceipt(review:MonthReview,content:Content){
 const {before,after}=review;
 const completed=campusMilestones(after).filter(m=>m.done&&!campusMilestones(before).some(old=>old.id===m.id&&old.done)).map(m=>m.label);
 const construction=after.halls.reduce((total,h)=>total+Math.max(0,h.costSpent-(before.halls.find(old=>old.id===h.id)?.costSpent??h.costSpent)),0);
 const changes=developments(review,content).filter(n=>!n.text.startsWith('DSCR headroom'));
 return {month:before.month+1,cashDelta:after.cash-before.cash,construction,completed,changes,decisions:review.actions.length+(review.eventChoices?.length??0)};
}
