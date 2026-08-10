export type SimulatedSkill = string;
export type SimulatedPetTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface SimulationPet {
  type: string;
  tier: SimulatedPetTier;
  level: number;
}

export interface SimulationProfile {
  magicalPower: number;
  skills: Partial<Record<SimulatedSkill, number>>;
  skillCaps?: Partial<Record<SimulatedSkill, { current: number; absolute: number }>>;
  pets: SimulationPet[];
}

export type SimulationChange =
  | { type: 'set-magical-power'; target: number }
  | { type: 'set-skill-level'; skill: SimulatedSkill; target: number }
  | { type: 'acquire-pet'; petType: 'ELEPHANT'; tier: SimulatedPetTier; level: number };

export interface SimulationImpact {
  id: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  unit: string;
  certainty: 'exact' | 'estimate';
}

export interface SimulationUnlock {
  id: string;
  title: string;
  requirement: string;
  newlyUnlocked: boolean;
}

export interface SimulationResult {
  applied: boolean;
  title: string;
  summary: string;
  originalProfile: SimulationProfile;
  simulatedProfile: SimulationProfile;
  change: SimulationChange;
  impacts: SimulationImpact[];
  unlocks: SimulationUnlock[];
  warnings: string[];
}
