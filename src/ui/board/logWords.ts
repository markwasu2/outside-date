import {formatMonth} from '../../engine/format';

/** Old and current engine logs store campaign indices; display the same clock as the map. */
export function logDetailWords(detail:string|undefined):string|undefined{
 return detail?.replace(/Outside date: month (\d+)\./g,(_match,month:string)=>`Tenant deadline: ${formatMonth(Number(month))}.`);
}
