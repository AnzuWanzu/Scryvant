import { z } from "zod";
const int = (min: number, max: number) => z.number().int().min(min).max(max);
export const scores = z
  .object({
    strength: int(0, 30),
    dexterity: int(0, 30),
    constitution: int(0, 30),
    intelligence: int(0, 30),
    wisdom: int(0, 30),
    charisma: int(0, 30),
  })
  .strict();
export const appearance = z
  .object({
    palette: z.enum(["jade", "ember", "violet"]),
    accessory: z.enum(["staff", "sword", "bow"]),
  })
  .strict();
export const choicesSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    classId: z.string().max(30),
    speciesId: z.string().max(30),
    speciesOptions: z
      .object({
        heritage: z.string().max(30).optional(),
        spellAbility: z
          .enum([
            "strength",
            "dexterity",
            "constitution",
            "intelligence",
            "wisdom",
            "charisma",
          ])
          .optional(),
        skill: z.string().max(30).optional(),
        size: z.enum(["small", "medium"]).optional(),
        originFeat: z.string().max(40).optional(),
      })
      .strict(),
    classOptions: z
      .object({
        expertise: z.array(z.string().max(30)).max(2),
        fightingStyle: z.string().max(40).optional(),
      })
      .strict(),
    backgroundId: z.string().max(30),
    startingEquipment: z.enum(["package", "gold"]).default("package"),
    method: z.enum(["standard", "point-buy", "rolled"]),
    baseScores: scores,
    boosts: scores,
    skills: z.array(z.string().max(30)).max(4),
    spells: z.array(z.string().max(80)).max(100),
    narrative: z.string().max(10000),
    appearance,
  })
  .strict();
export const advancementSchema = z
  .object({
    level: int(2, 20),
    boosts: scores,
    feat: z.string().max(80),
    hp: int(1, 12),
    subclassId: z.string().max(80).optional(),
  })
  .strict();
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("damage"), amount: int(1, 1000) }).strict(),
  z.object({ type: z.literal("heal"), amount: int(1, 1000) }).strict(),
  z.object({ type: z.literal("temp-hp"), amount: int(1, 1000) }).strict(),
  z
    .object({
      type: z.literal("rest"),
      kind: z.enum(["short", "long"]),
      hitDice: int(0, 20),
    })
    .strict(),
  z
    .object({
      type: z.literal("cast"),
      spellId: z.string().max(80),
      slot: int(0, 9),
    })
    .strict(),
  z.object({ type: z.literal("resource"), id: z.string().max(60) }).strict(),
  z
    .object({
      type: z.literal("conditions"),
      conditions: z.array(z.string().max(30)).max(15),
      exhaustion: int(0, 6),
    })
    .strict(),
  z.object({ type: z.literal("death-save"), roll: int(1, 20) }).strict(),
  z.object({ type: z.literal("concentration"), spellId: z.null() }).strict(),
  z
    .object({
      type: z.literal("inventory"),
      items: z
        .array(
          z
            .object({
              id: z.string().max(80),
              quantity: int(1, 1000),
              equipped: z.boolean(),
            })
            .strict(),
        )
        .max(100),
      gold: z.number().min(0).max(10000000),
    })
    .strict(),
  z.object({ type: z.literal("notes"), notes: z.string().max(20000) }).strict(),
  z
    .object({ type: z.literal("narrative"), narrative: z.string().max(10000) })
    .strict(),
  z.object({ type: z.literal("appearance"), appearance }).strict(),
  z
    .object({
      type: z.literal("spells"),
      spells: z.array(z.string().max(80)).max(100),
    })
    .strict(),
  z
    .object({
      type: z.literal("subclass"),
      subclassId: z.string().max(80),
    })
    .strict(),
  z
    .object({
      type: z.literal("level-up"),
      advancement: advancementSchema,
    })
    .strict(),
]);
export const updateSchema = z
  .object({ revision: int(0, 100000000), command: commandSchema })
  .strict();
