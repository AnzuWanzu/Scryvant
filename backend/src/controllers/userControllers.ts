import User from "../models/User";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { hash } from "bcryptjs";
import { COOKIE_NAME } from "../utils/constants";

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const users = await User.find();
    return res
      .status(200)
      .json({ message: "Users retrieved successfully", users });
  } catch (error) {
    console.log("Error in getAllUsers function:", error);
    return res.status(500).json({ message: "Failed to retrieve users" });
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, email, password } = req.body;
    //Validations:
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(409)
        .send("Email already in use. Please login or use a different email.");
    //
    const hashedPassword = await hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    //Create cookie and store the token.
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      signed: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });
    //TODO: Generate JWT Token || create tokenmanager function (utils)
  } catch (error) {}
};

//TODO:
// export const loginUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };

//TODO:
// export const verifyUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };

//TODO:
// export const logoutUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };
