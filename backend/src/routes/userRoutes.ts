import { Router } from "express";
import {
  createUser,
  getAllUsers,
  verifyOtp,
} from "../controllers/userControllers";
import {
  validate,
  signupValidator,
  verifyOtpValidator,
} from "../utils/validator";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

userRoutes.post("/signup", validate(signupValidator), createUser);

userRoutes.post("/verify-otp", validate(verifyOtpValidator), verifyOtp);

export default userRoutes;
