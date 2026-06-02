import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
} from "../controllers/characterController";
import { verifyToken } from "../utils/tokenManager";

const characterRoutes = Router();

characterRoutes.get("/", verifyToken, getUserCharacter);
characterRoutes.post("/", verifyToken, createCharacter); //TODO: Add validation for character creation payload.

export default characterRoutes;
