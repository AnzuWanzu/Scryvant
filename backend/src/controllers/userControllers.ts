import User from "../models/User";
import { Request, Response, NextFunction } from "express";
import { hash } from "bcryptjs";
import { COOKIE_NAME } from "../utils/constants";
import { createToken } from "../utils/tokenManager";

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
    console.log("Error in getAllUsers function: ", error);
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

    const token = createToken(user._id, user.email, "5d");
    const expires = new Date();
    expires.setDate(expires.getDate() + 5); //Set cookie to expire in 5 days.
    res.cookie(COOKIE_NAME, token, {
      path: "/",
      expires,
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(201).json({
      message: "User Created Successfully",
      name: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in createUser function: ", error);
    return res.status(500).json({ message: "Failed to create user" });
  }
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
