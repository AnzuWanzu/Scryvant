import { classes } from "../modules/rules/domain/catalog";
import { zeroScores } from "../modules/rules/domain/engine";
import type { CharacterChoices } from "../contracts";
export function fixture(classId = "wizard"): CharacterChoices {
  const cls = classes.find((c) => c.id === classId)!;
  const selectedSkills = cls.skills
    .filter((v) => !["Arcana", "History", "Perception"].includes(v))
    .slice(0, cls.skillCount);
  const trainedSkills = [...selectedSkills, "Arcana", "History", "Perception"];
  return {
    name: "Aster",
    classId,
    speciesId: "elf",
    speciesOptions: {
      heritage: "high-elf",
      spellAbility: "intelligence",
      skill: "Perception",
    },
    classOptions: {
      expertise: trainedSkills.slice(0, cls.initialExpertise ?? 0),
      fightingStyle: cls.fightingStyles?.[0],
    },
    backgroundId: "sage",
    startingEquipment: "package",
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
    skills: selectedSkills,
    spells: [],
    narrative: "",
    appearance: { palette: "jade", accessory: "staff" },
  };
}
