import type { ProgressionScoreInput } from '../progressionScore';
export type DeterministicRecommendationCategory='accessories'|'pets'|'hotm'|'hotf'|'collections'|'dungeons'|'garden'|'fishing'|'crimson'|'rift'|'skills'|'slayers';
export interface DeterministicEvidence { label:string; value:string|number }
export type EstimatedEffort = 'Low' | 'Medium' | 'High';
export interface DeterministicRecommendation { id:string;category:DeterministicRecommendationCategory;priority:number;title:string;explanation:string;evidence:DeterministicEvidence[];suggestedAction:string;expectedBenefit:string;estimatedEffort:EstimatedEffort;confidence:number;knowledgeReferences:string[] }
type RecommendationSeed = Omit<DeterministicRecommendation, 'expectedBenefit' | 'estimatedEffort' | 'confidence'>;

const EXPLAINABILITY: Record<string, { expectedBenefit: string; estimatedEffort: EstimatedEffort; confidence: number }> = {
  'low-magical-power': { expectedBenefit: 'Higher damage and combat stats from every selected accessory power.', estimatedEffort: 'Medium', confidence: 97 },
  'weak-active-pet': { expectedBenefit: 'Stronger activity-specific stats and more effective pet perks.', estimatedEffort: 'Medium', confidence: 92 },
  'missing-hotm-progression': { expectedBenefit: 'Unlocks the core mining tree and stronger powder progression.', estimatedEffort: 'High', confidence: 98 },
  'unused-powder': { expectedBenefit: 'Immediate mining stat gains without needing to earn additional powder.', estimatedEffort: 'Low', confidence: 99 },
  'missing-hotf-progression': { expectedBenefit: 'Unlocks additional Galatea foraging perks and activities.', estimatedEffort: 'Medium', confidence: 96 },
  'garden-neglected': { expectedBenefit: 'Improves farming progression, crop upgrades, and Garden unlocks.', estimatedEffort: 'Medium', confidence: 96 },
  'weak-dungeon-setup': { expectedBenefit: 'More consistent dungeon clears and readiness for harder floors.', estimatedEffort: 'High', confidence: 88 },
};

function explain(seed: RecommendationSeed): DeterministicRecommendation {
  const fixed = EXPLAINABILITY[seed.id];
  const collection = seed.category === 'collections';
  return {
    ...seed,
    expectedBenefit: fixed?.expectedBenefit ?? (collection
      ? 'Unlocks the next collection tier and its associated reward.'
      : 'Advances this progression category and improves profile readiness.'),
    estimatedEffort: fixed?.estimatedEffort ?? (collection ? 'Low' : 'Medium'),
    confidence: fixed?.confidence ?? Math.min(97, 85 + seed.evidence.length * 4),
  };
}
export function generateDeterministicRecommendations(p:ProgressionScoreInput):DeterministicRecommendation[] {
  const out:DeterministicRecommendation[]=[]; const add=(value:RecommendationSeed)=>out.push(explain(value));
  if(p.accessories.magicalPower<400)add({id:'low-magical-power',category:'accessories',priority:95,title:'Low Magical Power',explanation:'Magical Power is below a practical midgame baseline.',evidence:[{label:'Magical Power',value:p.accessories.magicalPower},{label:'Baseline',value:400}],suggestedAction:'Acquire missing accessory families and rarity upgrades.',knowledgeReferences:['combat_progression','gear_upgrade_logic']});
  const active=p.pets.find(pet=>pet.active);if(!active||active.level<80)add({id:'weak-active-pet',category:'pets',priority:75,title:'Weak Pet',explanation:'The active pet is missing or below level 80.',evidence:[{label:'Active pet',value:active?.displayName??'None'},{label:'Level',value:active?.level??0}],suggestedAction:'Equip a progression-appropriate pet and level it.',knowledgeReferences:['pet_progression']});
  if(p.hotm.available&&p.hotm.level<7)add({id:'missing-hotm-progression',category:'hotm',priority:88,title:'Missing HOTM Progression',explanation:'HOTM 7 unlocks the core powder-grinding tree.',evidence:[{label:'HOTM',value:p.hotm.level}],suggestedAction:'Complete daily commissions and mining events.',knowledgeReferences:['mining_hotm','mining_progression']});
  const unused=Object.values(p.hotm.powder).reduce((sum,powder)=>sum+powder.available,0);if(p.hotm.available&&unused>10_000)add({id:'unused-powder',category:'hotm',priority:70,title:'Unused Powder',explanation:'Available powder can immediately improve mining perks.',evidence:[{label:'Unused powder',value:unused}],suggestedAction:'Spend powder on perks that match the selected mining strategy.',knowledgeReferences:['mining_hotm']});
  if(p.hotf.available&&p.hotf.level<4)add({id:'missing-hotf-progression',category:'hotf',priority:72,title:'Heart of the Forest Progression',explanation:'HOTF progression unlocks Galatea foraging perks and activities.',evidence:[{label:'HOTF',value:p.hotf.level},{label:'Forest Whispers',value:p.hotf.forestWhispers}],suggestedAction:'Collect Tree Gifts and participate in Starlyn contests.',knowledgeReferences:['foraging_current_meta','foraging_progression']});
  const close=[...p.collections].filter(collection=>collection.remaining!==null&&collection.progressPercent>=75&&collection.progressPercent<100).sort((a,b)=>b.progressPercent-a.progressPercent)[0];if(close)add({id:`collection-${close.rawKey}`,category:'collections',priority:60,title:'Collection Milestone Nearby',explanation:`${close.name} is close to its next tier.`,evidence:[{label:'Progress',value:`${close.progressPercent}%`},{label:'Remaining',value:close.remaining??0}],suggestedAction:`Collect ${close.remaining?.toLocaleString()} more ${close.name}.`,knowledgeReferences:['general_progression']});
  if(p.garden.available&&p.garden.level<5)add({id:'garden-neglected',category:'garden',priority:67,title:'Garden Neglected',explanation:'Garden level is below 5.',evidence:[{label:'Garden level',value:p.garden.level}],suggestedAction:'Serve visitors and advance crop milestones.',knowledgeReferences:['farming_progression']});
  if(p.catacombs.level>=10&&p.catacombs.level<20)add({id:'weak-dungeon-setup',category:'dungeons',priority:65,title:'Weak Dungeon Setup',explanation:'Catacombs progression is in the early setup transition.',evidence:[{label:'Catacombs',value:p.catacombs.level}],suggestedAction:'Build a complete starred class setup before pushing floors.',knowledgeReferences:['dungeon_progression','gear_upgrade_logic']});
  return out.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
}
