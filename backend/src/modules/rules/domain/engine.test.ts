import { describe, test, expect } from "@jest/globals";
import { randomUUID } from "crypto";
import {
  applyCommand,
  createSheet,
  derive,
  slotMaximums,
  zeroScores,
} from "./engine";
import { classes, spells } from "./catalog";
import { fixture } from "../../../testing/fixtures";

describe("SRD deterministic character operations", () => {
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
      { ...fixture(), speciesId: "goliath" },
      "now",
    );
    expect(derive(c).speed).toBe(35);
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
    expect(criminal.features[0]?.name).toBe("Alert");
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
