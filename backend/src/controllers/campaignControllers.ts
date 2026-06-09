import Campaign from "../models/Campaign";
import { Request, Response } from "express";

export const getUserCampaigns = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }
    const campaigns = await Campaign.find({
      $or: [{ dmId: authUserId }, { playerIds: authUserId }],
    });
    return res.status(200).json({
      message: "Campaigns retrieved successfully.",
      campaigns,
    });
  } catch (error) {
    console.error("Error in getUserCampaigns function: ", error);
    return res.status(500).json({ message: "Failed to retrieve campaigns" });
  }
};

// export const getCampaignDetails = async (req: Request, res: Response) => {};

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const authUserId = res.locals.jwtData?.id;
    if (!authUserId) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User session not found." });
    }

    const { name, description } = req.body;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "Name and description are required." });
    }

    const newCampaign = new Campaign({
      name,
      description,
      dmId: authUserId,
      playerIds: [],
    });

    await newCampaign.save();

    return res.status(201).json({
      message: "Campaign created successfully.",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error in createCampaign function: ", error);
    return res.status(500).json({ message: "Failed to create campaign" });
  }
};

// export const joinCampaign = async (req: Request, res: Response) => {};

// export const awardExperiencePoints = async (req: Request, res: Response) => {};
