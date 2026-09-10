import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import type { Config } from "./config";
import { AppError } from "./errors";
import { identityService } from "../modules/identity/application/service";
import { characterService } from "../modules/characters/application/service";
import { assistanceService } from "../modules/assistance/application/service";
import {
  choicesSchema,
  updateSchema,
  scores,
} from "../modules/characters/application/schemas";
import { catalog } from "../modules/rules/domain/catalog";
import { derive } from "../modules/rules/domain/engine";
export function createApp(d: {
  config: Config;
  identity: ReturnType<typeof identityService>;
  characters: ReturnType<typeof characterService>;
  assistance: ReturnType<typeof assistanceService>;
  healthy: () => boolean;
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "48kb" }));
  app.use(cookieParser());
  const secure = d.config.NODE_ENV === "production";
  const cookie = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
  const authCookie = "scryvant_session",
    csrfCookie = "scryvant_csrf";
  app.get("/api/health", (_req, res) =>
    res
      .status(d.healthy() ? 200 : 503)
      .json({ status: d.healthy() ? "ok" : "unavailable" }),
  );
  app.get("/api/v1/session", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const previous = req.cookies[csrfCookie];
    const csrf =
      typeof previous === "string" && /^[a-f0-9]{64}$/.test(previous)
        ? previous
        : randomBytes(32).toString("hex");
    res.cookie(csrfCookie, csrf, cookie);
    let user = null;
    try {
      user = await d.identity.authenticate(req.cookies[authCookie]);
    } catch (e) {
      if (!(e instanceof AppError && e.status === 401)) throw e;
    }
    res.json({ user, csrf });
  });
  app.use("/api/v1", async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const token = req.get("X-CSRF-Token"),
        stored = req.cookies[csrfCookie];
      if (
        req.get("Origin") !== d.config.APP_ORIGIN ||
        typeof token !== "string" ||
        typeof stored !== "string" ||
        !/^[a-f0-9]{64}$/.test(token) ||
        !/^[a-f0-9]{64}$/.test(stored) ||
        !timingSafeEqual(Buffer.from(token), Buffer.from(stored))
      )
        throw new AppError(
          403,
          "CSRF",
          "Your form session expired. Refresh and try again.",
        );
      if (!req.is("application/json"))
        throw new AppError(415, "CONTENT_TYPE", "Use JSON requests.");
    }
    next();
  });
  const email = z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase());
  const password = z
    .string()
    .min(12)
    .max(72)
    .refine(
      (v) => Buffer.byteLength(v) <= 72,
      "Password must fit within 72 UTF-8 bytes.",
    );
  const credentials = z
    .object({ email, password: z.string().min(1).max(72) })
    .strict();
  const code = z.string().regex(/^\d{6}$/);
  const message = {
    message:
      "If the account is eligible, a code has been sent. Check your email.",
  };
  const auth = express.Router();
  auth.use(async (req, _res, next) => {
    await d.identity.throttle(`ip:${req.ip}`, 60, 900000);
    next();
  });
  auth.post("/signup", async (req, res) => {
    const v = z
      .object({ email, password, username: z.string().trim().min(2).max(40) })
      .strict()
      .parse(req.body);
    await d.identity.register(v);
    res.status(202).json(message);
  });
  auth.post("/login", async (req, res) => {
    const v = credentials.parse(req.body);
    const result = await d.identity.login(v.email, v.password);
    await d.identity.logout(req.cookies[authCookie]);
    res.cookie(authCookie, result.token, { ...cookie, maxAge: 5 * 86400000 });
    res.json({ user: result.user });
  });
  auth.post("/verify", async (req, res) => {
    const v = z.object({ email, code }).strict().parse(req.body);
    const result = await d.identity.verify(v.email, v.code);
    res.cookie(authCookie, result.token, { ...cookie, maxAge: 5 * 86400000 });
    res.json({ user: result.user });
  });
  auth.post("/resend", async (req, res) => {
    const v = z.object({ email }).strict().parse(req.body);
    await d.identity.resend(v.email, "verify");
    res.status(202).json(message);
  });
  auth.post("/forgot-password", async (req, res) => {
    const v = z.object({ email }).strict().parse(req.body);
    await d.identity.resend(v.email, "reset");
    res.status(202).json(message);
  });
  auth.post("/reset-password", async (req, res) => {
    const v = z.object({ email, code, password }).strict().parse(req.body);
    await d.identity.reset(v.email, v.code, v.password);
    res.clearCookie(authCookie, cookie);
    res.json({ message: "Password reset. Sign in with your new password." });
  });
  auth.post("/logout", async (req, res) => {
    await d.identity.logout(req.cookies[authCookie]);
    res.clearCookie(authCookie, cookie);
    res.json({ message: "Signed out." });
  });
  app.use("/api/v1/auth", auth);
  app.get("/api/v1/rules", (_req, res) => res.json(catalog));
  app.use("/api/v1/characters", async (req, res, next) => {
    res.locals.user = await d.identity.authenticate(req.cookies[authCookie]);
    next();
  });
  const uuid = z.uuid();
  const revision = z.number().int().nonnegative();
  app.get("/api/v1/characters", async (_req, res) =>
    res.json({ characters: await d.characters.list(res.locals.user.id) }),
  );
  app.post("/api/v1/characters", async (req, res) =>
    res
      .status(201)
      .json(
        await d.characters.create(
          res.locals.user.id,
          choicesSchema.parse(req.body),
        ),
      ),
  );
  app.get("/api/v1/characters/:id", async (req, res) => {
    const c = await d.characters.get(
      res.locals.user.id,
      uuid.parse(req.params.id),
    );
    res.json({ ...c, derived: derive(c) });
  });
  app.post("/api/v1/characters/:id/complete", async (req, res) => {
    const v = z
      .object({
        choices: choicesSchema,
        acknowledgeChanges: z.literal(true),
        advancements: z
          .array(
            z
              .object({
                level: z.number().int().min(2).max(20),
                boosts: scores,
                feat: z.string().max(80),
                hp: z.number().int().min(1).max(12),
              })
              .strict(),
          )
          .max(19),
      })
      .strict()
      .parse(req.body);
    res.json(
      await d.characters.complete(
        res.locals.user.id,
        uuid.parse(req.params.id),
        v.choices,
        v.advancements,
      ),
    );
  });
  app.post("/api/v1/characters/:id/commands", async (req, res) => {
    const v = updateSchema.parse(req.body);
    res.json(
      await d.characters.command(
        res.locals.user.id,
        uuid.parse(req.params.id),
        v.revision,
        v.command,
      ),
    );
  });
  app.delete("/api/v1/characters/:id", async (req, res) => {
    const v = z.object({ revision }).strict().parse(req.body);
    await d.characters.delete(
      res.locals.user.id,
      uuid.parse(req.params.id),
      v.revision,
    );
    res.status(204).end();
  });
  app.post("/api/v1/characters/:id/suggestions", async (req, res) => {
    const v = z
      .object({ prompt: z.string().trim().min(1).max(2000) })
      .strict()
      .parse(req.body);
    res.json(
      await d.assistance.suggest(
        res.locals.user.id,
        uuid.parse(req.params.id),
        v.prompt,
      ),
    );
  });
  app.post(
    "/api/v1/characters/:id/suggestions/:proposal/accept",
    async (req, res) => {
      const owner = res.locals.user.id;
      await d.characters.get(owner, uuid.parse(req.params.id));
      res.json(
        await d.assistance.accept(
          owner,
          uuid.parse(req.params.proposal),
          uuid.parse(req.params.id),
        ),
      );
    },
  );
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Endpoint not found.")),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          code: "VALIDATION",
          message: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
        return;
      }
      if (error instanceof AppError) {
        res
          .status(error.status)
          .json({ code: error.code, message: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        res
          .status(400)
          .json({ code: "INVALID_JSON", message: "Invalid request body." });
        return;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.too.large"
      ) {
        res.status(413).json({
          code: "TOO_LARGE",
          message: "Request exceeds the size limit.",
        });
        return;
      }
      console.error(
        JSON.stringify({
          event: "request_failed",
          kind: error instanceof Error ? error.name : "Unknown",
        }),
      );
      res.status(500).json({
        code: "INTERNAL",
        message: "Something went wrong. Please try again.",
      });
    },
  );
  return app;
}
