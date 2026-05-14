import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "./constants";

export const createToken = (id: string, email: string, expiresIn: any) => {
  const payload = { id, email };
  const secretKey = process.env.JWT_SECRET_KEY;

  if (!secretKey) {
    throw new Error("JWT_SECRET_KEY is not set");
  }

  const token = jwt.sign(payload, secretKey, {
    expiresIn,
  });

  return token;
};

export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.signedCookies[`${COOKIE_NAME}`];
  const secretKey = process.env.JWT_SECRET_KEY;

  if (!secretKey) {
    return res.status(500).json({ message: "JWT_SECRET_KEY is not set" });
  }

  if (!token || token.trim() === "") {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }
  return new Promise<void>((resolve, reject) => {
    return jwt.verify(
      token,
      secretKey,
      (
        err: jwt.VerifyErrors | null,
        success: string | jwt.JwtPayload | undefined,
      ) => {
        if (err) {
          reject(err.message);
          return res.status(401).json({ message: "Token Expired" });
        } else {
          resolve();
          res.locals.jwtData = success;
          return next();
        }
      },
    );
  });
};
