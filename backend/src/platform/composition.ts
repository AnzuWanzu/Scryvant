import { createHmac, randomBytes, randomInt, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { identityService } from "../modules/identity/application/service";
import { characterService } from "../modules/characters/application/service";
import { assistanceService } from "../modules/assistance/application/service";
import { geminiAdapter } from "../modules/assistance/adapters/gemini";
import type { Proposal } from "../contracts";
import type { Config } from "./config";
import { mongoAdapters } from "./mongo";
import { createApp } from "./http";
export async function compose(config: Config) {
  const mongo = await mongoAdapters(config.MONGODB_URI);
  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === "true",
    ...(config.SMTP_USER
      ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASS ?? "" } }
      : {}),
  });
  const identity = identityService({
    repository: mongo.identity,
    hashPassword: (p) => bcrypt.hash(p, 12),
    comparePassword: bcrypt.compare,
    digest: (p) =>
      createHmac("sha256", config.SESSION_SECRET).update(p).digest("hex"),
    token: () => randomBytes(32).toString("hex"),
    code: () => randomInt(100000, 1000000).toString(),
    uuid: randomUUID,
    now: () => new Date(),
    send: async (email, code, kind) => {
      await transporter.sendMail({
        from: config.EMAIL_FROM,
        to: email,
        subject: `Scryvant · ${kind === "verify" ? "Verify your email" : "Reset your password"}`,
        text: `Your ${kind === "verify" ? "verification" : "password reset"} code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      });
    },
  });
  const characters = characterService({
    repository: mongo.character,
    uuid: randomUUID,
    now: () => new Date(),
    roll: (sides) => randomInt(1, sides + 1),
  });
  const proposals = mongo.db.collection<{
    _id: string;
    owner: string;
    data: Proposal;
    expiresAt: Date;
  }>("proposals");
  await proposals.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const assistance = assistanceService({
    repository: {
      async put(owner, p) {
        await proposals.insertOne({
          _id: p.id,
          owner,
          data: p,
          expiresAt: new Date(Date.now() + 86400000),
        });
      },
      async get(owner, id) {
        return (await proposals.findOne({ _id: id, owner }))?.data ?? null;
      },
    },
    generate: geminiAdapter({
      key: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
    }),
    getCharacter: characters.get,
    apply: characters.command,
    quota: (owner) =>
      identity.throttle(`ai:${owner}`, config.AI_DAILY_LIMIT, 86400000),
    uuid: randomUUID,
    now: () => new Date(),
  });
  return {
    app: createApp({
      config,
      identity,
      characters,
      assistance,
      healthy: mongo.healthy,
    }),
    close: mongo.close,
  };
}
