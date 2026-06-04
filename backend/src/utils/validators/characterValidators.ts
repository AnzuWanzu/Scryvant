import { body, param } from "express-validator";

export const createCharacterValidator = [
  // 1. Core String Fields & Sanitation
  body("name")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Character name is required.")
    .isLength({ max: 50 })
    .withMessage("Character name cannot exceed 50 characters."),

  body("race").trim().escape().notEmpty().withMessage("Race is required."),

  body("class").trim().escape().notEmpty().withMessage("Class is required."),

  body("background").optional().trim().escape(),

  // 2. Nested Ability Scores (D&D range constraint validation)
  body("abilityScores")
    .notEmpty()
    .withMessage("Ability scores object is required."),
  body("abilityScores.strength")
    .isInt({ min: 1, max: 30 })
    .withMessage("Strength must be an integer between 1 and 30."),
  body("abilityScores.dexterity")
    .isInt({ min: 1, max: 30 })
    .withMessage("Dexterity must be an integer between 1 and 30."),
  body("abilityScores.constitution")
    .isInt({ min: 1, max: 30 })
    .withMessage("Constitution must be an integer between 1 and 30."),
  body("abilityScores.intelligence")
    .isInt({ min: 1, max: 30 })
    .withMessage("Intelligence must be an integer between 1 and 30."),
  body("abilityScores.wisdom")
    .isInt({ min: 1, max: 30 })
    .withMessage("Wisdom must be an integer between 1 and 30."),
  body("abilityScores.charisma")
    .isInt({ min: 1, max: 30 })
    .withMessage("Charisma must be an integer between 1 and 30."),

  // 3. Nested Hit Points (HP)
  body("hp").notEmpty().withMessage("HP properties are required."),
  body("hp.current")
    .isInt({ min: 0 })
    .withMessage("Current HP cannot be negative."),
  body("hp.max").isInt({ min: 1 }).withMessage("Max HP must be at least 1."),
  body("hp.temp")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Temporary HP cannot be negative."),

  // 4. Nested Hit Dice (With a custom dependency rule similar to your delete checker)
  body("hitDice").notEmpty().withMessage("Hit Dice properties are required."),
  body("hitDice.dieType")
    .isIn([6, 8, 10, 12])
    .withMessage(
      "Invalid Hit Die type. Must be 6, 8, 10, or 12 (e.g., d6, d8).",
    ),
  body("hitDice.total")
    .isInt({ min: 1, max: 20 })
    .withMessage("Total Hit Dice must be a number between 1 and 20."),
  body("hitDice.remaining")
    .isInt({ min: 0, max: 20 })
    .withMessage("Remaining Hit Dice cannot drop below 0.")
    .custom((value, { req }) => {
      if (value > (req.body.hitDice?.total || 0)) {
        throw new Error(
          "Remaining Hit Dice cannot exceed total available Hit Dice.",
        );
      }
      return true;
    }),
];

export const idParamValidator = [
  param("id")
    .isMongoId()
    .withMessage(
      "Invalid character ID format. Must be a valid MongoDB ObjectId.",
    ),
];
