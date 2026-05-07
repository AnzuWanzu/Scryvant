import { Router } from "express";
import { createUser, getAllUsers } from "../controllers/userControllers";
import { validate, signupValidator } from "../utils/validator";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

userRoutes.post("/signup", validate(signupValidator), createUser);

export default userRoutes;
