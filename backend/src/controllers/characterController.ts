import Character from "../models/Character";
import { Request, Response } from "express";

export const getUserCharacter = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const characters = await Character.find({ userId: authUserId });

    return res.status(200).json({
      message: "Characters retrieved successfully.",
      characters,
    });
  } catch (error) {
    console.log("Error in getUserCharacter function: ", error);
    return res.status(500).json({ message: "Failed to retrieve characters" });
  }
};

export const createCharacter = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }
    const {
      name,
      race,
      class: characterClass,
      background,
      abilityScores,
      hp,
      hitDice,
      armorClass,
      speed,
    } = req.body;

    if (
      !name ||
      !race ||
      !characterClass ||
      !abilityScores ||
      !hp ||
      !hitDice
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const newCharacter = new Character({
      userId: authUserId,
      name,
      race,
      class: characterClass,
      background,
      abilityScores,
      hp,
      hitDice,
      armorClass,
      speed,
    });

    const savedCharacter = await newCharacter.save();

    return res.status(201).json({
      message: "Character created successfully.",
      character: savedCharacter,
    });
  } catch (error) {
    console.error("Error in createCharacter function: ", error);
    res.status(500).json({ message: "Failed to create character" });
  }
};
