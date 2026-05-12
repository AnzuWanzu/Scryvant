import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

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
