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
  body("username")
    .trim()
    .escape() //HTML-encodes special characters
    .notEmpty()
    .withMessage("Username is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const signupValidator = [
  ...loginValidator,
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
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
