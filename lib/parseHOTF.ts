import { asRecord, nonNegativeNumber, titleCaseId } from './parserUtils.ts';

export interface HOTFPerk { id:string; name:string; level:number; maxLevel:number|null; description:string; costToNextLevel:number|null; enabled:boolean }
export interface HOTFTreeSlot { slot:number; perks:HOTFPerk[] }
export interface HOTFProgress { available:boolean; level:number; maxLevel:number; currentXp:number; xpIntoLevel:number; xpToNextLevel:number|null; progressPercent:number; forestWhispers:number; forestWhispersSpent:number; totalForestWhispers:number; tokensSpent:number; selectedAbility:string|null; selectedTreeSlot:number; sweep:number; foragingFortune:number; speedBoost:number; dailyWishes:number; centerOfTheForestLevel:number; perks:HOTFPerk[]; treeSlots:HOTFTreeSlot[]; rawFields:Readonly<Record<string,unknown>> }

type Definition={name:string;max:number;description:string;costPower?:number};
const DEFINITIONS:Record<string,Definition>={
  sweep:{name:'Sweep',max:50,description:'Increases Sweep while cutting trees.',costPower:3},
  foraging_fortune:{name:'Foraging Fortune',max:50,description:'Grants Foraging Fortune.',costPower:3},
  speed_boost:{name:'Forest Speed',max:50,description:'Grants Speed while on the Foraging Islands.',costPower:3.1},
  axe_toss:{name:'Axe Toss',max:5,description:'Axe ability that temporarily removes the Sweep penalty from throwing your axe.'},
  maniac_slicer:{name:'Maniac Slicer',max:1,description:'Axe ability that converts Mana into temporary Sweep.'},
  daily_wishes:{name:'Daily Wishes',max:50,description:'Improves daily Heart of the Forest rewards.',costPower:3},
  lottery:{name:'Lottery',max:1,description:'Grants a random Foraging effect each SkyBlock day.'},
  foraging_madness:{name:'Foraging Madness',max:1,description:'Grants Sweep and Foraging Fortune.'},
  deep_waters:{name:'Deep Waters',max:50,description:'Grants Pressure Resistance.',costPower:2.9},
  efficient_forager:{name:'Efficient Forager',max:100,description:'Improves tree-cutting efficiency.',costPower:2.8},
  collector:{name:'Collector',max:50,description:'Improves rewards gathered while foraging.',costPower:3},
  early_bird:{name:'Early Bird',max:1,description:'Grants bonus Sweep and Foraging Fortune for the first trees cut each day.'},
  precision_cutting:{name:'Precision Cutting',max:1,description:'Cut marked logs for bonus Sweep.'},
  monster_hunter:{name:'Monster Hunter',max:1,description:'Hunted monsters grant extra Forest Whispers.'},
  center_of_the_forest:{name:'Center of the Forest',max:5,description:'Permanent Heart of the Forest bonuses.'},
  tree_whisperer:{name:'Tree Whisperer',max:1,description:'Tree Gifts grant additional Forest Whispers.'},
  forest_strength:{name:'Forest Strength',max:50,description:'Converts a portion of Strength into Foraging Fortune.',costPower:3},
  half_full:{name:'Half Full',max:50,description:'Grants Foraging Fortune and shared Sweep near Half Empty.',costPower:3},
  half_empty:{name:'Half Empty',max:50,description:'Grants Foraging Fortune and shared Sweep near Half Full.',costPower:3},
  damage_boost:{name:'Damage Boost',max:5,description:'Axe ability that deals double damage to creatures on Galatea.'},
  strength_boost:{name:'Strength Boost',max:50,description:'Grants Strength while foraging.',costPower:3},
  luck_of_the_forest:{name:'Luck of the Forest',max:50,description:'Improves the chance of Foraging events and rewards.',costPower:3},
  gifts_250:{name:'250 Gifts',max:1,description:'Milestone perk connected to Tree Gifts.'},
  homing_axe:{name:'Homing Axe',max:1,description:'Throwing Axes gain homing behavior toward trees on Galatea.'},
  hunters_luck:{name:"Hunter's Luck",max:50,description:'Grants Hunter Fortune.',costPower:3.2},
  hunter_luck:{name:"Hunter's Luck",max:50,description:'Grants Hunter Fortune.',costPower:3.2},
  galateas_might:{name:"Galatea's Might",max:50,description:'Improves combat and gathering power on Galatea.',costPower:3.2},
  galatea_might:{name:"Galatea's Might",max:50,description:'Improves combat and gathering power on Galatea.',costPower:3.2},
  essence_fortune:{name:'Essence Fortune',max:50,description:'Improves Essence rewards from Galatea content.',costPower:3.2},
  forest_speed:{name:'Forest Speed',max:50,description:'Grants Speed while foraging.',costPower:3.1},
  ricochet:{name:'Ricochet',max:10,description:'Throwing Axe effects can bounce to additional trees.',costPower:3.4},
};
const XP=[0,0,3_000,12_000,37_000,97_000,197_000,347_000];
const rec = asRecord;
const num = nonNegativeNumber;
const title = titleCaseId;

function buildPerks(selected: Record<string, unknown>, persistentCenter: number): HOTFPerk[] {
  const unlocked=Object.entries(selected).filter(([id,v])=>!id.startsWith('toggle_')&&typeof v==='number'&&v>0).map(([id,v]):HOTFPerk=>{const d=DEFINITIONS[id];const perkLevel=num(v);return{id,name:d?.name??title(id),level:perkLevel,maxLevel:d?.max??null,description:d?.description??'Unlocked Heart of the Forest perk.',costToNextLevel:d?.costPower&&perkLevel<d.max?Math.round(Math.pow(perkLevel+2,d.costPower)):null,enabled:selected[`toggle_${id}`]!==false}});
  const seen=new Set(unlocked.map(p=>p.id));
  const perks=[...unlocked,...Object.entries(DEFINITIONS).filter(([id])=>!seen.has(id)).map(([id,d]):HOTFPerk=>({id,name:d.name,level:0,maxLevel:d.max,description:d.description,costToNextLevel:d.costPower?Math.round(Math.pow(2,d.costPower)):null,enabled:false}))];
  if(persistentCenter>0&&!perks.some(p=>p.id==='center_of_the_forest'&&p.level>0)){const d=DEFINITIONS.center_of_the_forest;const existing=perks.find(p=>p.id==='center_of_the_forest');if(existing){existing.level=persistentCenter;existing.enabled=true}else perks.push({id:'center_of_the_forest',name:d.name,level:persistentCenter,maxLevel:d.max,description:d.description,costToNextLevel:null,enabled:true})}
  return perks.sort((a,b)=>b.level-a.level||a.name.localeCompare(b.name));
}

export function parseHOTF(member:unknown):HOTFProgress {
  const m=rec(member);
  const tree=rec(m?.skill_tree);
  const nodes=rec(tree?.nodes)??{};
  const slots=rec(tree?.selected_skill_tree_slot);
  const slot=Math.max(1,num(slots?.foraging)||1);
  const selected=rec(nodes[slot===1?'foraging':`foraging_${slot}`])??rec(nodes.foraging)??{};
  const persistent=Math.max(...Object.entries(nodes).filter(([k])=>/^foraging(?:_\d+)?$/.test(k)).map(([,v])=>num(rec(v)?.center_of_the_forest)),0);
  const treeSlots=Object.entries(nodes)
    .filter(([key,value])=>/^foraging(?:_\d+)?$/.test(key)&&rec(value))
    .map(([key,value])=>({slot:key==='foraging'?1:num(key.split('_')[1]),perks:buildPerks(rec(value)??{},persistent)}))
    .sort((a,b)=>a.slot-b.slot);
  const core=rec(m?.foraging_core);
  const experience=rec(tree?.experience);
  const xp=num(experience?.foraging);
  let level=0;for(let i=1;i<XP.length;i+=1)if(xp>=XP[i])level=i;
  const current=XP[level]??0;
  const next=level<XP.length-1?XP[level+1]:null;
  const abilities=rec(tree?.selected_ability);
  const spent=rec(tree?.tokens_spent);
  const perks=buildPerks(selected,persistent);
  const whispers=num(core?.forests_whispers??core?.forest_whispers);
  const whispersSpent=num(core?.forests_whispers_spent??core?.forest_whispers_spent);
  return{available:tree!==null&&(experience?.foraging!==undefined||Object.keys(selected).length>0)||core!==null,level,maxLevel:XP.length-1,currentXp:xp,xpIntoLevel:Math.max(0,xp-current),xpToNextLevel:next===null?null:Math.max(0,next-xp),progressPercent:next===null?100:Math.min(100,Math.round((xp-current)/(next-current)*100)),forestWhispers:whispers,forestWhispersSpent:whispersSpent,totalForestWhispers:whispers+whispersSpent,tokensSpent:num(spent?.forest),selectedAbility:typeof abilities?.foraging==='string'?abilities.foraging:null,selectedTreeSlot:slot,sweep:num(selected.sweep),foragingFortune:num(selected.foraging_fortune),speedBoost:num(selected.speed_boost),dailyWishes:num(selected.daily_wishes),centerOfTheForestLevel:persistent,perks,treeSlots:treeSlots.length>0?treeSlots:[{slot:1,perks}],rawFields:{skill_tree:tree??{},foraging_core:core??{}}};
}
