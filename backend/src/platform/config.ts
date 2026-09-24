import { z } from "zod";
export function readConfig(env: NodeJS.ProcessEnv) {
  const schema = z.object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FRONTEND_DIST: z.string().min(1).optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    MONGODB_URI: z.string().min(1),
    APP_ORIGIN: z.url().default("http://localhost:5173"),
    SESSION_SECRET: z.string().min(32),
    SMTP_HOST: z.string().default("localhost"),
    SMTP_PORT: z.coerce.number().int().default(1025),
    SMTP_SECURE: z.string().default("false"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("Scryvant <hello@scryvant.local>"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),
    AI_DAILY_LIMIT: z.coerce.number().int().min(1).max(10000).default(20),
  });
  const c = schema.parse(env);
  if (c.NODE_ENV === "production" && !c.APP_ORIGIN.startsWith("https://"))
    throw Error("Production APP_ORIGIN must use HTTPS.");
  if (new URL(c.APP_ORIGIN).origin !== c.APP_ORIGIN)
    throw Error("APP_ORIGIN must be an origin without path or trailing slash.");
  return c;
}
export type Config = ReturnType<typeof readConfig>;
