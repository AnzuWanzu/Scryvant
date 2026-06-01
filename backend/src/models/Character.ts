import mongoose from "mongoose";
import { randomUUID } from "crypto";

const AbilityScoresSchema = new mongoose.Schema(
  {
    strength: { type: Number, required: true, min: 1, max: 30, default: 10 },
    dexterity: { type: Number, required: true, min: 1, max: 30, default: 10 },
    constitution: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
      default: 10,
    },
    intelligence: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
      default: 10,
    },
    wisdom: { type: Number, required: true, min: 1, max: 30, default: 10 },
    charisma: { type: Number, required: true, min: 1, max: 30, default: 10 },
  },
  { _id: false },
);

const HitDiceSchema = new mongoose.Schema(
  {
    dieType: { type: Number, required: true }, // 6, 8, 10, 12
    total: { type: Number, required: true },
    remaining: { type: Number, required: true },
  },
  { _id: false },
);

const HitPointsSchema = new mongoose.Schema(
  {
    current: { type: Number, required: true },
    max: { type: Number, required: true },
    temp: { type: Number, default: 0 },
  },
  { _id: false },
);

const CharacterSchema = new mongoose.Schema(
  {
    _id: { type: String, default: randomUUID },

    userId: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true },
    race: { type: String, required: true },
    class: { type: String, required: true },
    background: { type: String },

    level: { type: Number, required: true, min: 1, max: 20, default: 1 },
    experiencePoints: { type: Number, default: 0, min: 0 },
    proficiencyBonus: { type: Number, default: 2 },

    abilityScores: { type: AbilityScoresSchema, required: true },

    hp: { type: HitPointsSchema, required: true },
    hitDice: { type: HitDiceSchema, required: true },
    armorClass: { type: Number, default: 10 },
    speed: { type: Number, default: 30 },
  },
  { timestamps: true },
);

export default mongoose.model("Character", CharacterSchema);
