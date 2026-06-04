import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
  getCharacterById,
} from "../controllers/characterController";
import { validate } from "../utils/validators";
import {
  createCharacterValidator,
  idParamValidator,
} from "../utils/validators/characterValidators";
import { verifyToken } from "../utils/tokenManager";

const characterRoutes = Router();

characterRoutes.get("/", verifyToken, getUserCharacter);
characterRoutes.get(
  "/:id",
  verifyToken,
  validate(idParamValidator),
  getCharacterById,
);
characterRoutes.post(
  "/",
  verifyToken,
  validate(createCharacterValidator),
  createCharacter,
);

export default characterRoutes;
