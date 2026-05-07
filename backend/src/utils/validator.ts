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
    .escape() //strips html chars
    .notEmpty()
    .withMessage("Username is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

export const signupValidator = [
  ...loginValidator,
  body("email").isEmail().normalizeEmail().withMessage("Invalid email address"),
];
