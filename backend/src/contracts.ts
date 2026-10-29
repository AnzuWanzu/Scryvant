/** Public JSON contracts. No persistence or framework types cross this boundary. */
export type Ability =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";
export type Scores = Record<Ability, number>;
export type Appearance = {
  palette: "jade" | "ember" | "violet";
  accessory: "staff" | "sword" | "bow";
};
export type SpeciesOptions = {
  heritage?: string | undefined;
  spellAbility?: Ability | undefined;
  skill?: string | undefined;
  size?: "small" | "medium" | undefined;
  originFeat?: string | undefined;
};
export type ClassOptions = {
  expertise: string[];
  fightingStyle?: string | undefined;
};
export type CharacterChoices = {
  name: string;
  classId: string;
  speciesId: string;
  speciesOptions: SpeciesOptions;
  classOptions: ClassOptions;
  backgroundId: string;
  startingEquipment?: "package" | "gold";
  method: "standard" | "point-buy" | "rolled";
  baseScores: Scores;
  boosts: Scores;
  skills: string[];
  spells: string[];
  narrative: string;
  appearance: Appearance;
};
export type Advancement = {
  level: number;
  boosts: Scores;
  feat: string;
  hp: number;
  subclassId?: string | undefined;
};
export type InventoryEntry = {
  id: string;
  quantity: number;
  equipped: boolean;
};
export type PlayState = {
  hp: number;
  tempHp: number;
  hitDiceUsed: number;
  slotsUsed: number[];
  resourcesUsed: Record<string, number>;
  conditions: string[];
  exhaustion: number;
  deathSaves: { success: number; failure: number };
  concentration: string | null;
  inventory: InventoryEntry[];
  gold: number;
  notes: string;
};
export type Character = {
  id: string;
  userId: string;
  schemaVersion: 2;
  revision: number;
  choices: CharacterChoices;
  level: number;
  advancements: Advancement[];
  state: PlayState;
  history: { at: string; summary: string; revision: number }[];
  createdAt: string;
  updatedAt: string;
};
export type CharacterView = Character & { derived: Derived };
export type Derived = {
  scores: Scores;
  modifiers: Scores;
  proficiency: number;
  maxHp: number;
  armorClass: number;
  speed: number;
  initiative: number;
  saves: Scores;
  skills: Record<string, number>;
  spellLimits: { cantrips: number; prepared: number };
  spellAbility: Ability | null;
  spellAttack: number;
  spellDc: number;
  slots: number[];
  resources: {
    id: string;
    name: string;
    max: number;
    rest: "short" | "long" | "rage";
  }[];
  features: { name: string; level: number; page: number; text: string }[];
  attacks: { name: string; bonus: number; damage: string }[];
};
export type CharacterCommand =
  | { type: "damage" | "heal" | "temp-hp"; amount: number }
  | { type: "rest"; kind: "short" | "long"; hitDice: number }
  | { type: "cast"; spellId: string; slot: number }
  | { type: "resource"; id: string }
  | { type: "conditions"; conditions: string[]; exhaustion: number }
  | { type: "death-save"; roll: number }
  | { type: "concentration"; spellId: null }
  | { type: "inventory"; items: InventoryEntry[]; gold: number }
  | { type: "notes"; notes: string }
  | { type: "narrative"; narrative: string }
  | { type: "appearance"; appearance: Appearance }
  | { type: "spells"; spells: string[] }
  | { type: "subclass"; subclassId: string }
  | { type: "level-up"; advancement: Advancement };
export type UserView = { id: string; username: string; email: string };
export type Proposal = {
  id: string;
  characterId: string;
  revision: number;
  explanation: string;
  command: CharacterCommand | null;
  sources: { page: number; label: string }[];
  createdAt: string;
};
export type LegacyCharacter = {
  id: string;
  name: string;
  needsCompletion: true;
  legacy: Record<string, unknown>;
};

export type RulesCatalog = {
  version: string;
  abilities: Ability[];
  skillAbilities: Record<string, Ability>;
  conditions: string[];
  feats: {
    id: string;
    name: string;
    category: string;
    text: string;
    page: number;
  }[];
  classes: {
    id: string;
    name: string;
    die: number;
    saves: Ability[];
    casting: Ability | null;
    caster: "full" | "half" | "pact" | "none";
    subclassId: string;
    subclass: string;
    page: number;
    end: number;
    skills: string[];
    skillCount: number;
    armor: string[];
    fightingStyles?: string[];
    initialExpertise?: number;
  }[];
  species: {
    id: string;
    name: string;
    speed: number;
    page: number;
    traitSummary: string;
    heritageLabel?: string;
    choices: {
      heritages?: string[];
      spellAbilities?: Ability[];
      skills?: string[];
      sizes?: ("small" | "medium")[];
      originFeats?: string[];
    };
    defaults: SpeciesOptions;
  }[];
  backgrounds: {
    id: string;
    name: string;
    abilities: string[];
    skills: string[];
    feat: string;
    equipment: InventoryEntry[];
    gold: number;
  }[];
  equipment: {
    id: string;
    name: string;
    kind: "weapon" | "armor" | "gear";
    category: string;
    ac: number;
    damage: string;
    finesse: boolean;
    ranged: boolean;
    cost: number;
  }[];
  spells: {
    id: string;
    name: string;
    level: number;
    classes: string[];
    text: string;
    page: number;
    concentration: boolean;
    ritual: boolean;
  }[];
};
