import { Router } from "express";
import {
  createUser,
  getAllUsers,
  verifyOtp,
} from "../controllers/userControllers";
import { validate, signupValidator } from "../utils/validator";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

userRoutes.post("/signup", validate(signupValidator), createUser);

userRoutes.post("/verify-otp", verifyOtp);

export default userRoutes;
