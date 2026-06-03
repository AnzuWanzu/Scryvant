import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
} from "../controllers/characterController";
import { validate } from "../utils/validators";
import { createCharacterValidator } from "../utils/validators/characterValidators";
import { verifyToken } from "../utils/tokenManager";

const characterRoutes = Router();

characterRoutes.get("/", verifyToken, getUserCharacter);
characterRoutes.post(
  "/",
  verifyToken,
  validate(createCharacterValidator),
  createCharacter,
);

export default characterRoutes;
