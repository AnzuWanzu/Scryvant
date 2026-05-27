import mongoose from "mongoose";
import { randomUUID } from "crypto";

const campaignSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: randomUUID,
  },
  name: {}, // "Curse of Strahd"
  dmId: {}, // userId of the DM
  //   participants: [
  //     {
  //       userId,
  //       characterId,
  //       role: "player" | "dm",
  //     },
  //   ],
  //   isActive: Boolean,
  //   createdAt,
  //   updatedAt,
});
