import {formatDollars} from '../engine/format';
import type {GameState,RiskRow} from '../engine/types';

/** Present only what the saved ledger can establish. Retrofit choices and their cash
 * amounts are not retained, so never reconstruct a bill from the final hall count. */
export function riskRecordWords(row:RiskRow,state:GameState):{record:string;cost:string} {
 if(row.id==='tenantExit')return {record:'Informational only',cost:'Not simulated'};
 if(row.id==='chipObsolescence'&&state.scriptedDone.includes('chip_generation'))return {
  record:state.setup.hallTier==='hybrid'?'Upgrade absorbed by hybrid design':typeof state.flags.chipGenAssetPenalty==='number'&&state.flags.chipGenAssetPenalty<0?'Upgrade declined; asset penalty':'Upgrade event occurred',
  cost:'Not itemized here',
 };
 if(row.id==='plantSlip')return {record:state.power.plants.some(p=>p.slipped||(p.onlineMonth!==null&&p.plannedOnlineMonth!==null&&p.onlineMonth>p.plannedOnlineMonth))?'Yes':'No construction slip',cost:formatDollars(row.costToYou)};
 return {record:row.materialized?'Yes':'No recorded loss',cost:formatDollars(row.costToYou)};
}
