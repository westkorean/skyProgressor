import type { SkillProgress, SlayerProgress, CatacombsProgress } from './parseProfile';
import type { CollectionEntry } from './parseCollections';
import type { PetProgress } from './parsePets';
import type { AccessoriesData } from './parseAccessories';
import type { HOTMProgress } from './parseHOTM';
import type { HOTFProgress } from './parseHOTF';
import type { GardenProgress } from './parseGarden';
import type { FishingProgress } from './parseFishing';
import type { CrimsonProgress } from './parseCrimson';
import type { RiftProgress } from './parseRift';

export type ProgressionCategory = 'skills'|'slayers'|'catacombs'|'collections'|'pets'|'accessories'|'hotm'|'hotf'|'garden'|'fishing'|'crimson'|'rift';
export interface ProgressionScore { score:number; categoryBreakdown:Record<ProgressionCategory,number> }
export interface ProgressionScoreInput { skills:readonly SkillProgress[]; slayers:readonly SlayerProgress[]; catacombs:CatacombsProgress; collections:readonly CollectionEntry[]; pets:readonly PetProgress[]; accessories:AccessoriesData; hotm:HOTMProgress; hotf:HOTFProgress; garden:GardenProgress; fishing:FishingProgress; crimson:CrimsonProgress; rift:RiftProgress }

const clamp=(v:number)=>Math.max(0,Math.min(100,Math.round(Number.isFinite(v)?v:0)));
const avg=(v:number[])=>v.length?v.reduce((s,n)=>s+n,0)/v.length:0;

export function calculateProgressionScore(p:ProgressionScoreInput):ProgressionScore {
  const b:Record<ProgressionCategory,number>={
    skills:clamp(avg(p.skills.filter(s=>!['social','runecrafting','carpentry'].includes(s.skill)).map(s=>s.level/(s.absoluteMaxLevel??60)*100))),
    slayers:clamp(avg(p.slayers.map(s=>s.level/9*100))),
    catacombs:clamp(p.catacombs.level/50*100),
    collections:clamp(avg(p.collections.map(c=>c.maxTier?((c.tier??0)/c.maxTier*100):c.progressPercent))),
    pets:clamp(Math.min(100,p.pets.filter(x=>x.level>=100).length*5+avg(p.pets.slice(0,10).map(x=>x.level)))),
    accessories:clamp(p.accessories.magicalPower/12),
    hotm:clamp(p.hotm.level/p.hotm.maxLevel*100),
    hotf:clamp(p.hotf.level/p.hotf.maxLevel*100),
    garden:clamp(p.garden.level/p.garden.maxLevel*100),
    fishing:clamp(p.fishing.level/50*100),
    crimson:clamp((Math.min(12000,Math.max(p.crimson.mageReputation,p.crimson.barbarianReputation))/12000*50)+(Math.min(100,p.crimson.trophyFish.unique/p.crimson.trophyFish.totalTypes*100)*.5)),
    rift:clamp(p.rift.completionPercent),
  };
  return {score:clamp(avg(Object.values(b))),categoryBreakdown:b};
}
