import { describe, test, expect } from "@jest/globals";
import { randomUUID } from "crypto";
import {
  applyCommand,
  createSheet,
  derive,
  slotMaximums,
  zeroScores,
} from "./engine";
import { classes, species, spells } from "./catalog";
import { fixture } from "../../../testing/fixtures";

describe("SRD deterministic character operations", () => {
  for (const speciesRule of species)
    test(`${speciesRule.name}: default species choices create a valid sheet`, () => {
      const choices = fixture();
      choices.speciesId = speciesRule.id;
      choices.speciesOptions = { ...speciesRule.defaults };
      const character = createSheet("c", "u", choices, "now");
      expect(derive(character).features[0]).toMatchObject({
        name: `${speciesRule.name} Traits`,
        page: speciesRule.page,
      });
    });
  for (const cls of classes)
    test(`${cls.name}: creation and progression across levels 1–20`, () => {
      let c = createSheet(
        randomUUID(),
        "owner",
        fixture(cls.id),
        "2026-09-09T00:00:00Z",
      );
      for (let level = 1; level <= 20; level++) {
        const d = derive(c);
        expect(d.proficiency).toBe(2 + Math.floor((level - 1) / 4));
        expect(d.maxHp).toBeGreaterThan(0);
        expect(d.slots).toHaveLength(9);
        expect(d.resources.every((r) => r.max > 0)).toBe(true);
        if (level === 20) break;
        const asi = [
          4,
          8,
          12,
          16,
          ...(cls.id === "fighter" ? [6, 14] : []),
          ...(cls.id === "rogue" ? [10] : []),
        ].includes(level + 1);
        const boosts = zeroScores();
        if (asi) boosts.strength = 2;
        if (level + 1 === 19) boosts.charisma = 1;
        c = applyCommand(
          c,
          {
            type: "level-up",
            advancement: {
              level: level + 1,
              boosts,
              feat: asi
                ? "ability-score-improvement"
                : level + 1 === 19
                  ? "boon-of-combat-prowess"
                  : "",
              hp: cls.die / 2 + 1,
              subclassId: level + 1 === 3 ? cls.subclassId : undefined,
            },
          },
          () => 1,
        );
      }
    });
  test("standard array and background boosts cannot be fabricated", () => {
    const f = fixture();
    f.baseScores.strength = 18;
    expect(() => createSheet("c", "u", f, "now")).toThrow("standard");
  });
  test("point buy rejects over-budget scores", () => {
    const f = fixture();
    f.method = "point-buy";
    f.baseScores = {
      strength: 15,
      dexterity: 15,
      constitution: 15,
      intelligence: 15,
      wisdom: 15,
      charisma: 15,
    };
    expect(() => createSheet("c", "u", f, "now")).toThrow("27");
  });
  test("damage consumes temporary HP first and zero HP ends concentration", () => {
    let c = createSheet("c", "u", fixture(), "now");
    c.state.tempHp = 5;
    c.state.concentration = "light";
    c = applyCommand(c, { type: "damage", amount: 6 }, () => 1);
    expect(c.state.hp).toBe(7);
    c = applyCommand(c, { type: "damage", amount: 50 }, () => 1);
    expect(c.state.hp).toBe(0);
    expect(c.state.concentration).toBeNull();
    expect(c.state.conditions).toContain("Unconscious");
  });
  test("short rest spends only remaining hit dice and caps healing", () => {
    let c = createSheet("c", "u", fixture(), "now");
    c.state.hp = 1;
    c = applyCommand(c, { type: "rest", kind: "short", hitDice: 1 }, () => 6);
    expect(c.state.hp).toBe(8);
    expect(() =>
      applyCommand(c, { type: "rest", kind: "short", hitDice: 1 }, () => 6),
    ).toThrow("Hit Dice");
  });
  test("background equipment supports the SRD package or 50 GP choice", () => {
    const packaged = createSheet("c", "u", fixture(), "now");
    expect(packaged.state.gold).toBe(8);
    expect(packaged.state.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "quarterstaff", quantity: 1 }),
        expect.objectContaining({ id: "parchment", quantity: 8 }),
      ]),
    );
    const gold = createSheet(
      "c",
      "u",
      { ...fixture(), startingEquipment: "gold" },
      "now",
    );
    expect(gold.state).toMatchObject({ inventory: [], gold: 50 });
  });
  test("Goliaths use their 35-foot species speed", () => {
    const c = createSheet(
      "c",
      "u",
      {
        ...fixture(),
        speciesId: "goliath",
        speciesOptions: { heritage: "stone-giant" },
      },
      "now",
    );
    expect(derive(c).speed).toBe(35);
  });
  test("species choices are validated and affect the derived sheet", () => {
    const invalid = fixture();
    invalid.speciesOptions.heritage = "moon-elf";
    expect(() => createSheet("c", "u", invalid, "now")).toThrow(
      "valid Elf heritage",
    );

    const woodElf = fixture();
    woodElf.speciesOptions.heritage = "wood-elf";
    const derivedElf = derive(createSheet("c", "u", woodElf, "now"));
    expect(derivedElf.speed).toBe(35);
    expect(derivedElf.skills.Perception).toBe(3);
    expect(derivedElf.features[0]).toMatchObject({
      name: "Elf Traits",
      page: 84,
    });
  });
  test("Human Versatile grants a distinct Origin feat and skill", () => {
    const human = fixture();
    human.speciesId = "human";
    human.speciesOptions = {
      size: "medium",
      skill: "Perception",
      originFeat: "alert",
    };
    const derived = derive(createSheet("c", "u", human, "now"));
    expect(derived.initiative).toBe(derived.modifiers.dexterity + 2);
    expect(derived.skills.Perception).toBe(derived.modifiers.wisdom + 2);
    expect(derived.features).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Alert" })]),
    );
    expect(derived.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "heroic-inspiration", max: 1 }),
      ]),
    );

    human.backgroundId = "criminal";
    human.boosts = { ...zeroScores(), dexterity: 2, constitution: 1 };
    human.skills = ["Arcana", "History"];
    expect(() => createSheet("c", "u", human, "now")).toThrow(
      "different Origin feat",
    );
  });
  test("Rogue Expertise doubles proficiency only for trained choices", () => {
    const rogue = createSheet("c", "u", fixture("rogue"), "now");
    const derived = derive(rogue);
    expect(rogue.choices.classOptions.expertise).toEqual([
      "Acrobatics",
      "Athletics",
    ]);
    expect(derived.skills.Acrobatics).toBe(derived.modifiers.dexterity + 4);
    expect(derived.skills.Athletics).toBe(derived.modifiers.strength + 4);

    const invalid = fixture("rogue");
    invalid.classOptions.expertise = ["Acrobatics", "Stealth"];
    expect(() => createSheet("c", "u", invalid, "now")).toThrow(
      "trained skills",
    );
  });
  test("Fighting Styles affect armor and ranged attacks", () => {
    const defense = fixture("fighter");
    defense.classOptions.fightingStyle = "defense";
    const armored = createSheet("c", "u", defense, "now");
    armored.state.inventory.push({
      id: "leather",
      quantity: 1,
      equipped: true,
    });
    expect(derive(armored).armorClass).toBe(14);

    const archery = fixture("fighter");
    archery.classOptions.fightingStyle = "archery";
    const archer = createSheet("c", "u", archery, "now");
    archer.state.inventory.push({
      id: "shortbow",
      quantity: 1,
      equipped: true,
    });
    expect(derive(archer).attacks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Shortbow", bonus: 6 }),
      ]),
    );
  });
  test("level 3 requires an explicit supported subclass choice", () => {
    let wizard = createSheet("c", "u", fixture("wizard"), "now");
    wizard = applyCommand(
      wizard,
      {
        type: "level-up",
        advancement: {
          level: 2,
          boosts: zeroScores(),
          feat: "",
          hp: 4,
        },
      },
      () => 1,
    );

    expect(() =>
      applyCommand(
        wizard,
        {
          type: "level-up",
          advancement: {
            level: 3,
            boosts: zeroScores(),
            feat: "",
            hp: 4,
          },
        },
        () => 1,
      ),
    ).toThrow("subclass");
  });
  test("subclass features appear only after the level 3 choice is recorded", () => {
    let wizard = createSheet("c", "u", fixture("wizard"), "now");
    for (const level of [2, 3])
      wizard = applyCommand(
        wizard,
        {
          type: "level-up",
          advancement: {
            level,
            boosts: zeroScores(),
            feat: "",
            hp: 4,
            subclassId: level === 3 ? "evoker" : undefined,
          },
        },
        () => 1,
      );

    expect(derive(wizard).features.map((feature) => feature.name)).toContain(
      "Evocation Savant",
    );
    wizard.advancements[1]!.subclassId = undefined;
    expect(
      derive(wizard).features.map((feature) => feature.name),
    ).not.toContain("Evocation Savant");
  });
  test("an existing level 3 character can explicitly complete its subclass", () => {
    let wizard = createSheet("c", "u", fixture("wizard"), "now");
    for (const level of [2, 3])
      wizard = applyCommand(
        wizard,
        {
          type: "level-up",
          advancement: {
            level,
            boosts: zeroScores(),
            feat: "",
            hp: 4,
            subclassId: level === 3 ? "evoker" : undefined,
          },
        },
        () => 1,
      );
    wizard.advancements[1]!.subclassId = undefined;

    wizard = applyCommand(
      wizard,
      { type: "subclass", subclassId: "evoker" },
      () => 1,
    );
    expect(wizard.advancements[1]!.subclassId).toBe("evoker");
    expect(derive(wizard).features.map((feature) => feature.name)).toContain(
      "Evocation Savant",
    );
  });
  test("background Origin feats appear on the sheet and Alert modifies initiative", () => {
    const sage = derive(createSheet("c", "u", fixture(), "now"));
    expect(sage.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Magic Initiate (Wizard)", page: 87 }),
      ]),
    );
    const criminalChoice = fixture();
    criminalChoice.backgroundId = "criminal";
    criminalChoice.boosts = {
      ...zeroScores(),
      dexterity: 2,
      constitution: 1,
    };
    criminalChoice.skills = ["Arcana", "History"];
    const criminal = derive(createSheet("c", "u", criminalChoice, "now"));
    expect(criminal.initiative).toBe(criminal.modifiers.dexterity + 2);
    expect(criminal.features).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Alert" })]),
    );
  });
  test("slots follow full, half, and pact progression", () => {
    expect(slotMaximums("wizard", 20)).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect(slotMaximums("paladin", 1)[0]).toBe(2);
    expect(slotMaximums("warlock", 17)).toEqual([0, 0, 0, 0, 4, 0, 0, 0, 0]);
  });
  test("casting rejects unknown and exhausted spells", () => {
    let c = createSheet(
      "c",
      "u",
      { ...fixture(), spells: ["magic-missile"] },
      "now",
    );
    c = applyCommand(
      c,
      { type: "cast", spellId: "magic-missile", slot: 1 },
      () => 1,
    );
    c = applyCommand(
      c,
      { type: "cast", spellId: "magic-missile", slot: 1 },
      () => 1,
    );
    expect(() =>
      applyCommand(
        c,
        { type: "cast", spellId: "magic-missile", slot: 1 },
        () => 1,
      ),
    ).toThrow("slot");
  });
  test("SRD extraction includes unique spells and source pages", () => {
    expect(spells.length).toBe(339);
    expect(new Set(spells.map((s) => s.id)).size).toBe(spells.length);
    expect(
      spells.every(
        (s) => s.classes.length > 0 && s.page >= 107 && s.page <= 175,
      ),
    ).toBe(true);
  });
});
