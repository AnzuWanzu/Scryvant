import { Router } from "express";
import {
  createUser,
  getAllUsers,
  verifyOtp,
  loginUser,
} from "../controllers/userControllers";
import {
  validate,
  signupValidator,
  loginValidator,
  verifyOtpValidator,
} from "../utils/validator";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

userRoutes.post("/signup", validate(signupValidator), createUser);

userRoutes.post("/verify-otp", validate(verifyOtpValidator), verifyOtp);

userRoutes.post("/login", validate(loginValidator), loginUser);

export default userRoutes;
