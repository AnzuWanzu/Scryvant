import { classes } from "../modules/rules/domain/catalog";
import { zeroScores } from "../modules/rules/domain/engine";
import type { CharacterChoices } from "../contracts";
export function fixture(classId = "wizard"): CharacterChoices {
  const cls = classes.find((c) => c.id === classId)!;
  return {
    name: "Aster",
    classId,
    speciesId: "elf",
    backgroundId: "sage",
    method: "standard",
    baseScores: {
      strength: 8,
      dexterity: 14,
      constitution: 13,
      intelligence: 15,
      wisdom: 12,
      charisma: 10,
    },
    boosts: { ...zeroScores(), intelligence: 2, constitution: 1 },
    skills: cls.skills
      .filter((v) => !["Arcana", "History"].includes(v))
      .slice(0, cls.skillCount),
    spells: [],
    narrative: "",
    appearance: { palette: "jade", accessory: "staff" },
  };
}
