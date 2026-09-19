'use client';
import { useT } from '@/lib/i18n/language';
import { Switch } from '@/components/ui/switch';
import type { ColonyState } from '@/lib/simulation/types';

export default function SurfaceGuide({state,pheromones,onPheromones}:{state:ColonyState;pheromones:boolean;onPheromones:(show:boolean)=>void}){
 const tr=useT();
 const food=state.resources.filter(r=>r.kind!=='water');
 const remaining=food.reduce((sum,r)=>sum+r.amount,0),initial=food.reduce((sum,r)=>sum+r.initial,0);
 const peak=state.pheromones.reduce((max,value)=>Math.max(max,value),0);
 return <div className="surface-guide">
  <div className="surface-guide-row">
   <label className="trail-switch"><Switch checked={pheromones} onCheckedChange={onPheromones} aria-label={tr('Show surface pheromones')}/>{tr('Pheromone trails')}</label>
   {pheromones&&<div className="trail-legend" aria-label={tr('Pheromone concentration: dim is weak, bright is strong')}><span>{tr('Weak')}</span><i/><span>{tr('Strong')}</span><output title={tr('Highest concentration on the surface, in model units')}>{tr('Peak')} {peak.toFixed(1)}</output></div>}
   <span className="surface-food">{tr('Surface food')} <b>{Math.ceil(remaining)} / {Math.ceil(initial)}</b></span>
  </div>
  <details className="trail-explanation"><summary>{tr('How trails and food work')}</summary><p>{tr('Returning food and water carriers add pheromone as they walk. Repeated trips brighten the same route; unreinforced trails fade. This overlay shows the actual scent field ants sense locally, using a fixed brightness scale. Ants also use remembered routes and information from nearby nestmates.')}</p><p>{tr('Without reinforcement, scent halves every')} <strong>{Math.round(Math.log(2)/state.settings.pheromoneDecay)} {tr('simulation seconds')}</strong>. {tr('Change Trail persistence in Behavior settings to experiment. Food and water shrink with each collection, never refill automatically, and leave a Depleted marker when empty. Surface food counts nectar and protein outside, separate from the colony’s stored reserves.')}</p></details>
 </div>;
}
