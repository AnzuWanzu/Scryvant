import type { Ability } from "../../../contracts";
import srd from "./srd.json";
import progressionData from "./progression.json";
export const feats = progressionData.feats;
export const spellProgression: Record<
  string,
  { level: number; cantrips: number; prepared: number }[]
> = progressionData.progression;
export const abilities: Ability[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
export const skillAbilities: Record<string, Ability> = {
  Acrobatics: "dexterity",
  "Animal Handling": "wisdom",
  Arcana: "intelligence",
  Athletics: "strength",
  Deception: "charisma",
  History: "intelligence",
  Insight: "wisdom",
  Intimidation: "charisma",
  Investigation: "intelligence",
  Medicine: "wisdom",
  Nature: "intelligence",
  Perception: "wisdom",
  Performance: "charisma",
  Persuasion: "charisma",
  Religion: "intelligence",
  "Sleight of Hand": "dexterity",
  Stealth: "dexterity",
  Survival: "wisdom",
};
export type ClassRule = {
  id: string;
  name: string;
  die: number;
  saves: Ability[];
  casting: Ability | null;
  caster: "full" | "half" | "pact" | "none";
  subclass: string;
  page: number;
  end: number;
  skills: string[];
  skillCount: number;
  armor: string[];
};
export const classes: ClassRule[] = [
  {
    id: "barbarian",
    name: "Barbarian",
    die: 12,
    saves: ["strength", "constitution"],
    casting: null,
    caster: "none",
    subclass: "Path of the Berserker",
    page: 28,
    end: 30,
    skills: [
      "Animal Handling",
      "Athletics",
      "Intimidation",
      "Nature",
      "Perception",
      "Survival",
    ],
    skillCount: 2,
    armor: ["light", "medium", "shield"],
  },
  {
    id: "bard",
    name: "Bard",
    die: 8,
    saves: ["dexterity", "charisma"],
    casting: "charisma",
    caster: "full",
    subclass: "College of Lore",
    page: 31,
    end: 35,
    skills: Object.keys(skillAbilities),
    skillCount: 3,
    armor: ["light"],
  },
  {
    id: "cleric",
    name: "Cleric",
    die: 8,
    saves: ["wisdom", "charisma"],
    casting: "wisdom",
    caster: "full",
    subclass: "Life Domain",
    page: 36,
    end: 40,
    skills: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    skillCount: 2,
    armor: ["light", "medium", "shield"],
  },
  {
    id: "druid",
    name: "Druid",
    die: 8,
    saves: ["intelligence", "wisdom"],
    casting: "wisdom",
    caster: "full",
    subclass: "Circle of the Land",
    page: 41,
    end: 46,
    skills: [
      "Animal Handling",
      "Arcana",
      "Insight",
      "Medicine",
      "Nature",
      "Perception",
      "Religion",
      "Survival",
    ],
    skillCount: 2,
    armor: ["light", "shield"],
  },
  {
    id: "fighter",
    name: "Fighter",
    die: 10,
    saves: ["strength", "constitution"],
    casting: null,
    caster: "none",
    subclass: "Champion",
    page: 47,
    end: 49,
    skills: [
      "Acrobatics",
      "Animal Handling",
      "Athletics",
      "History",
      "Insight",
      "Intimidation",
      "Persuasion",
      "Perception",
      "Survival",
    ],
    skillCount: 2,
    armor: ["light", "medium", "heavy", "shield"],
  },
  {
    id: "monk",
    name: "Monk",
    die: 8,
    saves: ["strength", "dexterity"],
    casting: null,
    caster: "none",
    subclass: "Warrior of the Open Hand",
    page: 49,
    end: 52,
    skills: [
      "Acrobatics",
      "Athletics",
      "History",
      "Insight",
      "Religion",
      "Stealth",
    ],
    skillCount: 2,
    armor: [],
  },
  {
    id: "paladin",
    name: "Paladin",
    die: 10,
    saves: ["wisdom", "charisma"],
    casting: "charisma",
    caster: "half",
    subclass: "Oath of Devotion",
    page: 53,
    end: 56,
    skills: [
      "Athletics",
      "Insight",
      "Intimidation",
      "Medicine",
      "Persuasion",
      "Religion",
    ],
    skillCount: 2,
    armor: ["light", "medium", "heavy", "shield"],
  },
  {
    id: "ranger",
    name: "Ranger",
    die: 10,
    saves: ["strength", "dexterity"],
    casting: "wisdom",
    caster: "half",
    subclass: "Hunter",
    page: 57,
    end: 61,
    skills: [
      "Animal Handling",
      "Athletics",
      "Insight",
      "Investigation",
      "Nature",
      "Perception",
      "Stealth",
      "Survival",
    ],
    skillCount: 3,
    armor: ["light", "medium", "shield"],
  },
  {
    id: "rogue",
    name: "Rogue",
    die: 8,
    saves: ["dexterity", "intelligence"],
    casting: null,
    caster: "none",
    subclass: "Thief",
    page: 61,
    end: 64,
    skills: [
      "Acrobatics",
      "Athletics",
      "Deception",
      "Insight",
      "Intimidation",
      "Investigation",
      "Perception",
      "Persuasion",
      "Sleight of Hand",
      "Stealth",
    ],
    skillCount: 4,
    armor: ["light"],
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    die: 6,
    saves: ["constitution", "charisma"],
    casting: "charisma",
    caster: "full",
    subclass: "Draconic Sorcery",
    page: 65,
    end: 70,
    skills: [
      "Arcana",
      "Deception",
      "Insight",
      "Intimidation",
      "Persuasion",
      "Religion",
    ],
    skillCount: 2,
    armor: [],
  },
  {
    id: "warlock",
    name: "Warlock",
    die: 8,
    saves: ["wisdom", "charisma"],
    casting: "charisma",
    caster: "pact",
    subclass: "Fiend Patron",
    page: 70,
    end: 77,
    skills: [
      "Arcana",
      "Deception",
      "History",
      "Intimidation",
      "Investigation",
      "Nature",
      "Religion",
    ],
    skillCount: 2,
    armor: ["light"],
  },
  {
    id: "wizard",
    name: "Wizard",
    die: 6,
    saves: ["intelligence", "wisdom"],
    casting: "intelligence",
    caster: "full",
    subclass: "Evoker",
    page: 77,
    end: 82,
    skills: [
      "Arcana",
      "History",
      "Insight",
      "Investigation",
      "Medicine",
      "Religion",
    ],
    skillCount: 2,
    armor: [],
  },
];
export const species = [
  "Dragonborn",
  "Dwarf",
  "Elf",
  "Gnome",
  "Goliath",
  "Halfling",
  "Human",
  "Orc",
  "Tiefling",
].map((name) => ({
  id: name.toLowerCase(),
  name,
  speed: name === "goliath" ? 35 : 30,
  page: 83,
}));
export const backgrounds = [
  {
    id: "acolyte",
    name: "Acolyte",
    abilities: ["intelligence", "wisdom", "charisma"],
    skills: ["Insight", "Religion"],
    feat: "Magic Initiate (Cleric)",
  },
  {
    id: "criminal",
    name: "Criminal",
    abilities: ["dexterity", "constitution", "intelligence"],
    skills: ["Sleight of Hand", "Stealth"],
    feat: "Alert",
  },
  {
    id: "sage",
    name: "Sage",
    abilities: ["constitution", "intelligence", "wisdom"],
    skills: ["Arcana", "History"],
    feat: "Magic Initiate (Wizard)",
  },
  {
    id: "soldier",
    name: "Soldier",
    abilities: ["strength", "dexterity", "constitution"],
    skills: ["Athletics", "Intimidation"],
    feat: "Savage Attacker",
  },
];
export const conditions = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
];
export type ItemRule = {
  id: string;
  name: string;
  kind: "weapon" | "armor" | "gear";
  category: string;
  ac: number;
  damage: string;
  finesse: boolean;
  ranged: boolean;
  cost: number;
};
export const equipment: ItemRule[] = [
  ...[
    "Club|1d4|1",
    "Dagger|1d4|2",
    "Greatclub|1d8|2",
    "Handaxe|1d6|5",
    "Javelin|1d6|1",
    "Light Hammer|1d4|2",
    "Mace|1d6|5",
    "Quarterstaff|1d6|2",
    "Sickle|1d4|1",
    "Spear|1d6|1",
    "Dart|1d4|1",
    "Light Crossbow|1d8|25",
    "Shortbow|1d6|25",
    "Sling|1d4|1",
    "Battleaxe|1d8|10",
    "Flail|1d8|10",
    "Glaive|1d10|20",
    "Greataxe|1d12|30",
    "Greatsword|2d6|50",
    "Halberd|1d10|20",
    "Lance|1d10|10",
    "Longsword|1d8|15",
    "Maul|2d6|10",
    "Morningstar|1d8|15",
    "Pike|1d10|5",
    "Rapier|1d8|25",
    "Scimitar|1d6|25",
    "Shortsword|1d6|10",
    "Trident|1d8|5",
    "Warhammer|1d8|15",
    "War Pick|1d8|5",
    "Whip|1d4|2",
    "Blowgun|1|10",
    "Hand Crossbow|1d6|75",
    "Heavy Crossbow|1d10|50",
    "Longbow|1d8|50",
    "Musket|1d12|500",
    "Pistol|1d10|250",
  ].map((line, i) => {
    const [name, damage, cost] = line.split("|") as [string, string, string];
    return {
      id: name.toLowerCase().replaceAll(" ", "-"),
      name,
      kind: "weapon" as const,
      category: i < 14 ? "simple" : "martial",
      ac: 0,
      damage,
      finesse: [
        "Dagger",
        "Dart",
        "Rapier",
        "Scimitar",
        "Shortsword",
        "Whip",
      ].includes(name),
      ranged: /bow|Sling|Dart|Blowgun|Musket|Pistol/.test(name),
      cost: Number(cost),
    };
  }),
  ...[
    "Padded|11|light|5",
    "Leather|11|light|10",
    "Studded Leather|12|light|45",
    "Hide|12|medium|10",
    "Chain Shirt|13|medium|50",
    "Scale Mail|14|medium|50",
    "Breastplate|14|medium|400",
    "Half Plate|15|medium|750",
    "Ring Mail|14|heavy|30",
    "Chain Mail|16|heavy|75",
    "Splint|17|heavy|200",
    "Plate|18|heavy|1500",
    "Shield|2|shield|10",
  ].map((line) => {
    const [name, ac, category, cost] = line.split("|") as [
      string,
      string,
      string,
      string,
    ];
    return {
      id: name.toLowerCase().replaceAll(" ", "-"),
      name,
      kind: "armor" as const,
      category,
      ac: Number(ac),
      damage: "",
      finesse: false,
      ranged: false,
      cost: Number(cost),
    };
  }),
  ...[
    "Backpack",
    "Bedroll",
    "Rope",
    "Torch",
    "Rations",
    "Waterskin",
    "Spellbook",
    "Arcane Focus",
    "Holy Symbol",
    "Druidic Focus",
    "Potion of Healing",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    kind: "gear" as const,
    category: "gear",
    ac: 0,
    damage: "",
    finesse: false,
    ranged: false,
    cost: 0,
  })),
];
export const spells = srd.spells;
export const pages = srd.pages;
export function classFeatures(id: string, level: number) {
  const rule = classes.find((c) => c.id === id)!;
  const source = pages.map((p) => `\n[[PAGE:${p.page}]]\n${p.text}`).join("\n");
  const begin = source.indexOf(`\n${rule.name}\nCore ${rule.name} Traits\n`);
  const next = classes[classes.indexOf(rule) + 1];
  const end = next
    ? source.indexOf(`\n${next.name}\nCore ${next.name} Traits\n`, begin + 1)
    : source.indexOf("\nCharacter Origins\n", begin);
  const section = source.slice(begin, end > begin ? end : undefined);
  const matches = [...section.matchAll(/^Level (\d+): ([^\n]+)\n/gm)];
  return matches
    .filter((m) => Number(m[1]) <= level)
    .map((m) => {
      const position = matches.indexOf(m);
      const pageMarkers = [
        ...source.slice(0, begin + m.index!).matchAll(/\[\[PAGE:(\d+)\]\]/g),
      ];
      const page = Number(pageMarkers.at(-1)?.[1] ?? rule.page);
      const body = section
        .slice(m.index! + m[0].length, matches[position + 1]?.index)
        .replace(/\[\[PAGE:\d+\]\]/g, "");
      return {
        name: m[2]!,
        level: Number(m[1]),
        page,
        text: body.slice(0, 8000),
      };
    });
}
export const catalog = {
  version: "5.2.1",
  classes,
  species,
  backgrounds,
  equipment,
  spells,
  conditions,
  feats,
  abilities,
  skillAbilities,
};
