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

export const getCharacterById = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const id = req.params.id as string;

    const character = await Character.findOne({
      _id: id,
      userId: authUserId,
    });

    if (!character) {
      return res.status(404).json({ message: "Character not found." });
    }

    return res.status(200).json({
      message: "Character sheet retrieved successfully.",
      character,
    });
  } catch (error) {
    console.error("Error in getCharacterById function: ", error);
    return res.status(500).json({ message: "Failed to retrieve character" });
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

export const updateCharacterById = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const id = req.params.id as string;

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
      level,
      experiencePoints,
      proficiencyBonus,
    } = req.body;

    const updatedCharacter = await Character.findOneAndUpdate(
      { _id: id, userId: authUserId as string },
      {
        $set: {
          name,
          race,
          class: characterClass,
          background,
          abilityScores,
          hp,
          hitDice,
          armorClass,
          speed,
          level,
          experiencePoints,
          proficiencyBonus,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedCharacter) {
      return res
        .status(404)
        .json({ message: "Character not found or unauthorized to update." });
    }

    return res.status(200).json({
      message: "Character updated successfully.",
      character: updatedCharacter,
    });
  } catch (error) {
    console.error("Error in updateCharacterById function: ", error);
    return res.status(500).json({ message: "Failed to update character" });
  }
};

export const deleteCharacterById = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const id = req.params.id as string;

    const deletedCharacter = await Character.findOneAndDelete({
      _id: id,
      userId: authUserId,
    });

    if (!deletedCharacter) {
      return res
        .status(404)
        .json({ message: "Character not found or unauthorized to delete." });
    }

    return res.status(200).json({
      message: "Character deleted successfully.",
      character: deletedCharacter,
    });
  } catch (error) {
    console.error("Error in deleteCharacterById function: ", error);
    return res.status(500).json({ message: "Failed to delete character" });
  }
};
