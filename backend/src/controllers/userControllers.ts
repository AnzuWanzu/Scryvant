import User from "../models/User";
import { Request, Response, NextFunction } from "express";
import { compare, hash } from "bcryptjs";
import {
  COOKIE_NAME,
  TOKEN_EXPIRY_STRING,
  TOKEN_EXPIRY_DAYS,
} from "../utils/constants";
import { createToken } from "../utils/tokenManager";
import { compareOtp, generateOtp, hashOtp, sendOtpEmail } from "../utils/otp";

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
  let createdUserId: string | null = null;
  try {
    const { username, email, password } = req.body;

    //Validations:
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const message =
        existingUser.email === email
          ? "Email already in use"
          : "Username already taken";

      return res.status(409).json({ message });
    }

    const hashedPassword = await hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });

    //Generate OTP, hash, and save to user.
    const otp = generateOtp();
    user.otp = await hashOtp(otp);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    createdUserId = user._id;

    await sendOtpEmail(user.email, otp);

    return res.status(201).json({
      message: "User created successfully. Check your email for the OTP.",
      name: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in createUser function: ", error);

    if (createdUserId) {
      try {
        await User.deleteOne({ _id: createdUserId });
      } catch (rollbackError) {
        console.log(
          "Error rolling back user after OTP email failure: ",
          rollbackError,
        );
      }
    }

    return res.status(500).json({ message: "Failed to create user" });
  }
};

export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select("+otp +otpExpires");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({ message: "No OTP found for this user" });
    }

    if (user.otpExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const isOtpValid = await compareOtp(otp, user.otp);

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    //Create JWT token first (fail early if config is missing)
    const token = createToken(user._id, user.email, TOKEN_EXPIRY_STRING);
    const expires = new Date();
    expires.setDate(expires.getDate() + TOKEN_EXPIRY_DAYS);

    //Clear OTP
    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      signed: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });

    res.cookie(COOKIE_NAME, token, {
      path: "/",
      expires,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
    });

    return res.status(200).json({
      message: "User verified successfully. Added to system.",
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in verifyOtp function: ", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;

    //Validations:
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordCorrect = await compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    //Clear cookie and Generate new Token:
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      signed: true,
      path: "/",
      secure: true,
      sameSite: "none",
    });

    const token = createToken(user._id, user.email, TOKEN_EXPIRY_STRING);
    const expires = new Date();
    expires.setDate(expires.getDate() + TOKEN_EXPIRY_DAYS);

    res.cookie(COOKIE_NAME, token, {
      path: "/",
      expires,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
    });

    return res.status(200).json({
      message: "Sucessfully logged in a user: ",
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in loginUser function: ", error);
    return res.status(500).json({ message: "Failed to login user" });
  }
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    //User token Check:
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      message: "User is authenticated",
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    console.log("Error in verifyUser function: ", error);
    return res.status(500).json({ message: "Failed to verify user" });
  }
};

//TODO:
// export const logoutUser = async (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   try {
//   } catch (error) {}
// };
