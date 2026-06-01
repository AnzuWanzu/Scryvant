import { Router } from "express";
import {
  createCharacter,
  getUserCharacter,
} from "../controllers/characterController";

const characterRoutes = Router();

characterRoutes.get("/user/:userId", getUserCharacter); //TODO: add middleware
characterRoutes.post("/", createCharacter); //TODO: add middleware

export default characterRoutes;
