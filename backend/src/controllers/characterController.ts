import Character from "../models/Character";
import { Request, Response } from "express";

export const getUserCharacter = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const characters = await Character.find({ userId });

    return res.status(200).json({
      message: "Characters retrieved successfully from user",
      characters,
    });
  } catch (error) {
    console.log("Error in getUserCharacter function: ", error);
    return res.status(500).json({ message: "Failed to retrieve characters" });
  }
};

export const createCharacter = async (req: Request, res: Response) => {
  try {
    const {
      userId,
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
      !userId ||
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
      userId,
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

    res.status(201).json({
      message: "Character created successfully.",
      character: savedCharacter,
    });
  } catch (error) {
    console.error("Error in createCharacter function: ", error);
    res.status(500).json({ message: "Failed to create character" });
  }
};
