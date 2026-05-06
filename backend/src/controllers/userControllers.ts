import User from "../models/User";
import { Request, Response, NextFunction } from "express";

export const getAllUser = async (
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

// export const createUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };

// export const loginUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };

// export const verifyUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };

// export const logoutUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };
