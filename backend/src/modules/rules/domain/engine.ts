import type {
  Character,
  CharacterChoices,
  CharacterCommand,
  Derived,
  Scores,
} from "../../../contracts";
import {
  abilities,
  backgrounds,
  classes,
  classFeatures,
  conditions,
  equipment,
  skillAbilities,
  species,
  spells,
} from "./catalog";
import { AppError } from "../../../platform/errors";
export const zeroScores = (): Scores => ({
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
});
export const modifier = (n: number) => Math.floor((n - 10) / 2);
const fail = (message: string): never => {
  throw new AppError(422, "RULES", message);
};
const fullSlots = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
export function slotMaximums(classId: string, level: number): number[] {
  const c = classes.find((c) => c.id === classId)!;
  if (c.caster === "none") return Array(9).fill(0);
  if (c.caster === "pact") {
    const a = Array(9).fill(0);
    a[Math.min(5, Math.ceil(level / 2)) - 1] =
      level === 1 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
    return a;
  }
  const row = fullSlots[c.caster === "half" ? Math.ceil(level / 2) : level]!;
  return Array.from({ length: 9 }, (_, i) => row[i] ?? 0);
}
export function validateChoices(c: CharacterChoices) {
  const cls = classes.find((v) => v.id === c.classId),
    bg = backgrounds.find((v) => v.id === c.backgroundId);
  if (!cls || !bg || !species.some((v) => v.id === c.speciesId))
    fail("Choose a supported class, species, and background.");
  const values = abilities.map((a) => c.baseScores[a]);
  if (values.some((n) => !Number.isInteger(n) || n < 3 || n > 18))
    fail("Base abilities must be integers between 3 and 18.");
  if (
    c.method === "standard" &&
    [...values].sort((a, b) => a - b).join(",") !== "8,10,12,13,14,15"
  )
    fail("Use each standard-array value once.");
  const costs: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
  };
  if (
    c.method === "point-buy" &&
    (values.some((v) => costs[v] === undefined) ||
      values.reduce((n, v) => n + costs[v]!, 0) > 27)
  )
    fail("Point buy allows 27 points and base scores from 8 to 15.");
  if (
    abilities.some(
      (a) =>
        !Number.isInteger(c.boosts[a]) ||
        c.boosts[a] < 0 ||
        c.boosts[a] > 2 ||
        (!bg!.abilities.includes(a) && c.boosts[a] !== 0),
    ) ||
    abilities.reduce((n, a) => n + c.boosts[a], 0) !== 3
  )
    fail("Assign +2/+1 or +1/+1/+1 among your background’s abilities.");
  if (
    new Set(c.skills).size !== c.skills.length ||
    c.skills.length !== cls!.skillCount ||
    c.skills.some((s) => !cls!.skills.includes(s) || bg!.skills.includes(s))
  )
    fail(
      "Choose the required number of distinct class skills, excluding background proficiencies.",
    );
}
export function derive(c: Character): Derived {
  const cls = classes.find((v) => v.id === c.choices.classId)!;
  const bg = backgrounds.find((v) => v.id === c.choices.backgroundId)!;
  const scores = zeroScores(),
    modifiers = zeroScores(),
    saves = zeroScores();
  for (const a of abilities) {
    scores[a] =
      c.choices.baseScores[a] +
      c.choices.boosts[a] +
      c.advancements.reduce((n, v) => n + v.boosts[a], 0);
    if (
      cls.id === "barbarian" &&
      c.level === 20 &&
      (a === "strength" || a === "constitution")
    )
      scores[a] += 4;
    modifiers[a] = modifier(scores[a]);
  }
  const proficiency = 2 + Math.floor((c.level - 1) / 4);
  for (const a of abilities)
    saves[a] =
      modifiers[a] +
      (cls.saves.includes(a) || (cls.id === "monk" && c.level >= 14)
        ? proficiency
        : 0);
  const skills = Object.fromEntries(
    Object.entries(skillAbilities).map(([s, a]) => [
      s,
      modifiers[a] +
        ([...c.choices.skills, ...bg.skills].includes(s)
          ? proficiency
          : cls.id === "bard" && c.level >= 2
            ? Math.floor(proficiency / 2)
            : 0),
    ]),
  );
  const maxHp =
    Math.max(1, cls.die + modifiers.constitution) +
    c.advancements.reduce(
      (n, a) => n + Math.max(1, a.hp + modifiers.constitution),
      0,
    ) +
    (c.choices.speciesId === "dwarf" ? c.level : 0) +
    (cls.id === "sorcerer" && c.level >= 3 ? c.level : 0);
  const worn = c.state.inventory
    .filter((i) => i.equipped)
    .map((i) => equipment.find((e) => e.id === i.id)!)
    .filter(Boolean);
  const armor = worn.find((i) => i.kind === "armor" && i.category !== "shield");
  const shield = worn.some((i) => i.category === "shield");
  let armorClass = 10 + modifiers.dexterity;
  if (armor)
    armorClass =
      armor.ac +
      (armor.category === "heavy"
        ? 0
        : armor.category === "medium"
          ? Math.min(2, modifiers.dexterity)
          : modifiers.dexterity);
  else if (cls.id === "barbarian") armorClass += modifiers.constitution;
  else if (cls.id === "monk" && !shield) armorClass += modifiers.wisdom;
  else if (cls.id === "sorcerer" && c.level >= 3)
    armorClass = 10 + modifiers.dexterity + modifiers.charisma;
  if (shield) armorClass += 2;
  const resources: Derived["resources"] = [];
  const add = (
    id: string,
    name: string,
    max: number,
    rest: "short" | "long" | "rage" = "long",
  ) => resources.push({ id, name, max, rest });
  if (cls.id === "barbarian")
    add(
      "rage",
      "Rage",
      c.level < 3
        ? 2
        : c.level < 6
          ? 3
          : c.level < 12
            ? 4
            : c.level < 17
              ? 5
              : 6,
      "rage",
    );
  if (cls.id === "bard")
    add(
      "inspiration",
      "Bardic Inspiration",
      Math.max(1, modifiers.charisma),
      c.level >= 5 ? "short" : "long",
    );
  if (cls.id === "cleric" && c.level >= 2)
    add(
      "channel-divinity",
      "Channel Divinity",
      c.level < 6 ? 2 : c.level < 18 ? 3 : 4,
    );
  if (cls.id === "druid" && c.level >= 2)
    add("wild-shape", "Wild Shape", c.level < 6 ? 2 : c.level < 17 ? 3 : 4);
  if (cls.id === "fighter") {
    add("second-wind", "Second Wind", c.level < 4 ? 2 : c.level < 10 ? 3 : 4);
    if (c.level >= 2)
      add("action-surge", "Action Surge", c.level < 17 ? 1 : 2, "short");
    if (c.level >= 9)
      add(
        "indomitable",
        "Indomitable",
        c.level < 13 ? 1 : c.level < 17 ? 2 : 3,
      );
  }
  if (cls.id === "monk" && c.level >= 2)
    add("focus", "Focus Points", c.level, "short");
  if (cls.id === "paladin") {
    add("lay-on-hands", "Lay on Hands", 5 * c.level);
    if (c.level >= 3)
      add("channel-divinity", "Channel Divinity", c.level < 11 ? 2 : 3);
  }
  if (cls.id === "ranger") add("favored-enemy", "Favored Enemy", proficiency);
  if (cls.id === "sorcerer") {
    add("innate-sorcery", "Innate Sorcery", 2);
    if (c.level >= 2) add("sorcery-points", "Sorcery Points", c.level);
  }
  if (cls.id === "warlock" && c.level >= 11)
    for (const [i, l] of [11, 13, 15, 17].entries())
      if (c.level >= l) add(`arcanum-${i + 6}`, `Mystic Arcanum ${i + 6}`, 1);
  if (cls.id === "wizard") add("arcane-recovery", "Arcane Recovery", 1);
  const speed =
    (species.find((s) => s.id === c.choices.speciesId)?.speed ?? 30) +
    (cls.id === "barbarian" && c.level >= 5 && armor?.category !== "heavy"
      ? 10
      : 0) +
    (cls.id === "monk" && c.level >= 2 && !armor && !shield
      ? 10 + 5 * Math.floor((c.level - 2) / 4)
      : 0) -
    c.state.exhaustion * 5;
  const spellMod = cls.casting ? modifiers[cls.casting] : 0;
  const martial = ["barbarian", "fighter", "paladin", "ranger"].includes(
    cls.id,
  );
  const attacks = worn
    .filter((i) => i.kind === "weapon")
    .map((w) => {
      const m = w.finesse
        ? Math.max(modifiers.strength, modifiers.dexterity)
        : w.ranged
          ? modifiers.dexterity
          : modifiers.strength;
      return {
        name: w.name,
        bonus: m + (w.category === "simple" || martial ? proficiency : 0),
        damage: `${w.damage} ${m >= 0 ? "+" : "−"} ${Math.abs(m)}`,
      };
    });
  return {
    scores,
    modifiers,
    proficiency,
    maxHp,
    armorClass,
    speed: Math.max(0, speed),
    initiative: modifiers.dexterity + (bg.id === "criminal" ? proficiency : 0),
    saves,
    skills,
    spellAbility: cls.casting,
    spellAttack: spellMod + proficiency,
    spellDc: 8 + proficiency + spellMod,
    slots: slotMaximums(cls.id, c.level),
    resources,
    features: classFeatures(cls.id, c.level),
    attacks,
  };
}
function validateSpells(c: Character) {
  const cls = classes.find((v) => v.id === c.choices.classId)!;
  const max = slotMaximums(cls.id, c.level).findLastIndex((n) => n > 0) + 1;
  if (new Set(c.choices.spells).size !== c.choices.spells.length)
    fail("A spell may only be selected once.");
  for (const id of c.choices.spells) {
    const s = spells.find((s) => s.id === id);
    if (!s || !s.classes.includes(cls.id) || s.level > max)
      fail("Select spells available to your class and level.");
  }
}
export function createSheet(
  id: string,
  userId: string,
  choices: CharacterChoices,
  now: string,
): Character {
  validateChoices(choices);
  const c: Character = {
    id,
    userId,
    schemaVersion: 2,
    revision: 0,
    choices,
    level: 1,
    advancements: [],
    state: {
      hp: 1,
      tempHp: 0,
      hitDiceUsed: 0,
      slotsUsed: Array(9).fill(0),
      resourcesUsed: {},
      conditions: [],
      exhaustion: 0,
      deathSaves: { success: 0, failure: 0 },
      concentration: null,
      inventory: [],
      gold: 0,
      notes: "",
    },
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  validateSpells(c);
  c.state.hp = derive(c).maxHp;
  return c;
}
export function applyCommand(
  original: Character,
  command: CharacterCommand,
  roll: (sides: number) => number,
): Character {
  const c: Character = structuredClone(original),
    d = derive(c),
    cls = classes.find((v) => v.id === c.choices.classId)!;
  switch (command.type) {
    case "damage": {
      let amount = command.amount;
      const absorbed = Math.min(amount, c.state.tempHp);
      c.state.tempHp -= absorbed;
      amount -= absorbed;
      c.state.hp = Math.max(0, c.state.hp - amount);
      if (c.state.hp === 0) {
        c.state.concentration = null;
        if (!c.state.conditions.includes("Unconscious"))
          c.state.conditions.push("Unconscious");
      }
      break;
    }
    case "heal":
      c.state.hp = Math.min(d.maxHp, c.state.hp + command.amount);
      if (c.state.hp > 0) {
        c.state.deathSaves = { success: 0, failure: 0 };
        c.state.conditions = c.state.conditions.filter(
          (v) => v !== "Unconscious",
        );
      }
      break;
    case "temp-hp":
      c.state.tempHp = Math.max(c.state.tempHp, command.amount);
      break;
    case "rest": {
      if (c.state.hp === 0) fail("Resolve unconsciousness before resting.");
      if (command.kind === "long") {
        c.state.hp = d.maxHp;
        c.state.tempHp = 0;
        c.state.hitDiceUsed = 0;
        c.state.slotsUsed = Array(9).fill(0);
        c.state.resourcesUsed = {};
        c.state.exhaustion = Math.max(0, c.state.exhaustion - 1);
        c.state.deathSaves = { success: 0, failure: 0 };
        c.state.concentration = null;
      } else {
        if (command.hitDice > c.level - c.state.hitDiceUsed)
          fail("Not enough Hit Dice remain.");
        for (let i = 0; i < command.hitDice; i++)
          c.state.hp = Math.min(
            d.maxHp,
            c.state.hp + Math.max(0, roll(cls.die) + d.modifiers.constitution),
          );
        c.state.hitDiceUsed += command.hitDice;
        if (cls.caster === "pact") c.state.slotsUsed = Array(9).fill(0);
        for (const r of d.resources) {
          if (r.rest === "short") c.state.resourcesUsed[r.id] = 0;
          else if (
            ["rage", "channel-divinity", "wild-shape", "second-wind"].includes(
              r.id,
            )
          )
            c.state.resourcesUsed[r.id] = Math.max(
              0,
              (c.state.resourcesUsed[r.id] ?? 0) - 1,
            );
        }
      }
      break;
    }
    case "cast": {
      const s = spells.find((s) => s.id === command.spellId);
      if (!s || !c.choices.spells.includes(s.id))
        fail("Select a spell on your sheet.");
      if (s!.level === 0) {
        if (command.slot !== 0) fail("Cantrips do not use spell slots.");
      } else {
        const index = command.slot - 1;
        if (
          command.slot < s!.level ||
          (d.slots[index] ?? 0) <= (c.state.slotsUsed[index] ?? 0)
        )
          fail("No suitable spell slot remains.");
        c.state.slotsUsed[index] = (c.state.slotsUsed[index] ?? 0) + 1;
      }
      if (s!.concentration) c.state.concentration = s!.id;
      break;
    }
    case "resource": {
      const r = d.resources.find((r) => r.id === command.id);
      if (!r || (c.state.resourcesUsed[r.id] ?? 0) >= r.max)
        fail("This resource is unavailable or exhausted.");
      c.state.resourcesUsed[r!.id] = (c.state.resourcesUsed[r!.id] ?? 0) + 1;
      break;
    }
    case "conditions":
      if (
        command.conditions.some((s) => !conditions.includes(s)) ||
        new Set(command.conditions).size !== command.conditions.length
      )
        fail("Invalid condition.");
      c.state.conditions = command.conditions;
      c.state.exhaustion = command.exhaustion;
      if (
        command.conditions.some((s) =>
          ["Incapacitated", "Unconscious", "Paralyzed", "Stunned"].includes(s),
        )
      )
        c.state.concentration = null;
      break;
    case "death-save":
      if (
        c.state.hp !== 0 ||
        c.state.deathSaves.failure >= 3 ||
        c.state.deathSaves.success >= 3
      )
        fail("Death saves are not currently required.");
      if (command.roll === 20) {
        c.state.hp = 1;
        c.state.deathSaves = { success: 0, failure: 0 };
        c.state.conditions = c.state.conditions.filter(
          (v) => v !== "Unconscious",
        );
      } else if (command.roll >= 10)
        c.state.deathSaves.success = Math.min(
          3,
          c.state.deathSaves.success + 1,
        );
      else
        c.state.deathSaves.failure = Math.min(
          3,
          c.state.deathSaves.failure + (command.roll === 1 ? 2 : 1),
        );
      break;
    case "concentration":
      c.state.concentration = null;
      break;
    case "inventory": {
      if (new Set(command.items.map((i) => i.id)).size !== command.items.length)
        fail("Combine duplicate inventory items.");
      let armorCount = 0,
        shieldCount = 0;
      for (const i of command.items) {
        const item = equipment.find((v) => v.id === i.id);
        if (!item) fail("Unknown equipment.");
        if (i.equipped && item!.kind === "armor") {
          if (!cls.armor.includes(item!.category))
            fail("Your class lacks training with this armor.");
          if (item!.category === "shield") shieldCount++;
          else armorCount++;
        }
      }
      if (armorCount > 1 || shieldCount > 1)
        fail("Equip only one suit of armor and one shield.");
      c.state.inventory = command.items;
      c.state.gold = command.gold;
      break;
    }
    case "notes":
      c.state.notes = command.notes;
      break;
    case "narrative":
      c.choices.narrative = command.narrative;
      break;
    case "appearance":
      c.choices.appearance = command.appearance;
      break;
    case "spells":
      c.choices.spells = command.spells;
      validateSpells(c);
      break;
    case "level-up": {
      const a = command.advancement;
      if (c.level >= 20 || a.level !== c.level + 1)
        fail("Advance exactly one level at a time, up to 20.");
      if (a.hp < 1 || a.hp > cls.die)
        fail("Record a valid Hit Die roll or its fixed value.");
      const asi = [
        4,
        8,
        12,
        16,
        ...(cls.id === "fighter" ? [6, 14] : []),
        ...(cls.id === "rogue" ? [10] : []),
      ].includes(a.level);
      const total = abilities.reduce((n, k) => n + a.boosts[k], 0);
      if (asi) {
        if (
          total !== 2 ||
          a.feat !== "ability-score-improvement" ||
          abilities.some(
            (k) =>
              a.boosts[k] < 0 ||
              a.boosts[k] > 2 ||
              d.scores[k] + a.boosts[k] > 20,
          )
        )
          fail("Assign two Ability Score Improvement points, maximum 20.");
      } else if (total !== 0 || a.feat !== "")
        fail("This level does not grant an Ability Score Improvement.");
      c.level++;
      c.advancements.push(a);
      c.state.hp += derive(c).maxHp - d.maxHp;
      break;
    }
  }
  return c;
}
