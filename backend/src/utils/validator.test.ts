import { Request, Response, NextFunction } from "express";
import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { validate, loginValidator } from "./validator";

describe("Validator Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {} };
    next = jest.fn();

    res = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn() as any,
    };
  });

  test("should allow valid login details to pass", async () => {
    req.body = { email: "test@scryvant.com", password: "password123" };

    const middlewares = validate(loginValidator);

    // Added await here to ensure it resolves sequentially
    await middlewares[0]!(req as Request, res as Response, next);
    await middlewares[1]!(req as Request, res as Response, next);
    await middlewares[2]!(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("should block logins with short passwords", async () => {
    req.body = { email: "test@scryvant.com", password: "123" };

    const middlewares = validate(loginValidator);

    await middlewares[0]!(req as Request, res as Response, next);
    await middlewares[1]!(req as Request, res as Response, next);

    (next as any).mockClear();

    await middlewares[2]!(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled(); // This will now pass beautifully!
  });
});
