import mongoose from "mongoose";
import { randomUUID } from "crypto";

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: randomUUID,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
});

export default mongoose.model("User", userSchema);
