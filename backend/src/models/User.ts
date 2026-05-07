import mongoose from "mongoose";
import { randomUUID } from "crypto";

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: randomUUID,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["player", "dm"],
      default: "player",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }, //Automatically add createdAt and updatedAt
);

export default mongoose.model("User", userSchema);
