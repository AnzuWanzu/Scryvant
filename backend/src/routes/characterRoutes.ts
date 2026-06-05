import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
  getCharacterById,
  updateCharacterById,
} from "../controllers/characterController";
import { validate } from "../utils/validators";
import {
  createCharacterValidator,
  updateCharacterValidator,
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
characterRoutes.put(
  "/:id",
  verifyToken,
  validate([...idParamValidator, ...updateCharacterValidator]),
  updateCharacterById,
);

export default characterRoutes;
