import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
  getCharacterById,
  updateCharacterById,
  deleteCharacterById,
} from "../controllers/characterControllers";
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
characterRoutes.delete(
  "/:id",
  verifyToken,
  validate(idParamValidator),
  deleteCharacterById,
);
export default characterRoutes;
