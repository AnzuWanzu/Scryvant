import { Router } from "express";
import {
  createUser,
  getAllUsers,
  verifyOtp,
  loginUser,
  verifyUser,
  logoutUser,
  deleteUser,
} from "../controllers/userControllers";
import {
  validate,
  signupValidator,
  loginValidator,
  verifyOtpValidator,
  deleteUserValidator,
} from "../utils/validator";
import { verifyToken } from "../utils/tokenManager";

const userRoutes = Router();

userRoutes.get("/", getAllUsers);

userRoutes.post("/signup", validate(signupValidator), createUser);

userRoutes.post("/verify-otp", validate(verifyOtpValidator), verifyOtp);

userRoutes.post("/login", validate(loginValidator), loginUser);

userRoutes.get("/verifyUser", verifyToken, verifyUser);

userRoutes.get("/logout", verifyToken, logoutUser);

userRoutes.delete(
  "/delete",
  verifyToken,
  validate(deleteUserValidator),
  deleteUser,
);

export default userRoutes;
