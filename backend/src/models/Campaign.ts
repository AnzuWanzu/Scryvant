import mongoose from "mongoose";
import { randomUUID } from "crypto";

export interface ICampaign {
  _id: string;
  title: string;
  description?: string;
  dmId: string;
  characters: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new mongoose.Schema(
  {
    _id: { type: String, default: randomUUID },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: [100, "Title cannot exceed 100 characters."],
    },
    description: {
      type: String,
      trim: true,
    },
    dmId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    characters: [
      {
        type: String,
        ref: "Character",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Campaign", CampaignSchema);
