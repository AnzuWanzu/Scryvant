import { Request, Response, NextFunction } from "express";
import { body, validationResult, ValidationChain } from "express-validator";

export const validate = (validators: ValidationChain[]) => {
  return [
    ...validators,
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
      next();
    },
  ];
};

export const loginValidator = [
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const signupValidator = [
  ...loginValidator,
  body("username")
    .trim()
    .escape() //HTML-encodes special characters
    .notEmpty()
    .withMessage("Username is required"),

  body("isAdmin").custom((value, { req }) => {
    if (req.body && "isAdmin" in req.body) {
      throw new Error(
        "You are not authorized to set administrative privileges.",
      );
    }
    return true;
  }),
];

export const verifyOtpValidator = [
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("otp")
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be exactly 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only digits"),
];

export const deleteUserValidator = [
  body().custom((_, { req }) => {
    const { userId, email, username } = req.body;

    if (!userId && !email && !username) {
      throw new Error("Provide userId, email, or username");
    }

    return true;
  }),
  body("userId").optional().trim().notEmpty(),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
  body("username").optional().trim().notEmpty(),
];
