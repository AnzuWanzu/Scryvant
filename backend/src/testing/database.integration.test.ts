import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { randomUUID, createHash } from "crypto";
import { spawn, type ChildProcess } from "child_process";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { createServer } from "net";
import bcrypt from "bcryptjs";
import request from "supertest";
import { mongoAdapters } from "../platform/mongo";
import { createApp } from "../platform/http";
import { readConfig } from "../platform/config";
import { migrateLegacy } from "../platform/migration";
import { identityService } from "../modules/identity/application/service";
import { characterService } from "../modules/characters/application/service";
import { assistanceService } from "../modules/assistance/application/service";
import { memoryProposalRepository } from "./memory";
import { fixture } from "./fixtures";
import { zeroScores } from "../modules/rules/domain/engine";

let mongo: Awaited<ReturnType<typeof mongoAdapters>>;
let processHandle: ChildProcess | undefined;
let directory: string | undefined;
let app: ReturnType<typeof createApp>;
let identity: ReturnType<typeof identityService>;
const origin = "http://localhost:5174";
const emails = new Map<string, string>();
const password = "a sufficiently long password";

beforeAll(async () => {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    const port = await new Promise<number>((resolve) => {
      const socket = createServer();
      socket.listen(0, "127.0.0.1", () => {
        const address = socket.address();
        const value = typeof address === "object" && address ? address.port : 0;
        socket.close(() => resolve(value));
      });
    });
    directory = await mkdtemp(`${tmpdir()}/scryvant-tests-`);
    processHandle = spawn(
      "mongod",
      [
        "--dbpath",
        directory,
        "--port",
        String(port),
        "--bind_ip",
        "127.0.0.1",
        "--quiet",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error("Test MongoDB failed to start.")),
        15000,
      );
      processHandle!.once("error", reject);
      processHandle!.stdout!.on("data", (chunk) => {
        if (String(chunk).includes("Waiting for connections")) {
          clearTimeout(timeout);
          resolve();
        }
      });
      processHandle!.once("exit", (code) => {
        if (code) {
          clearTimeout(timeout);
          reject(Error(`MongoDB exited: ${code}`));
        }
      });
    });
    uri = `mongodb://127.0.0.1:${port}`;
  }
  // Every test run gets its own database. Never drop a user's configured database.
  const parsed = new URL(uri);
  parsed.pathname = `/scryvant_test_${randomUUID().replaceAll("-", "")}`;
  mongo = await mongoAdapters(parsed.toString());
  identity = identityService({
    repository: mongo.identity,
    hashPassword: (v) => bcrypt.hash(v, 4),
    comparePassword: bcrypt.compare,
    digest: (v) => createHash("sha256").update(v).digest("hex"),
    token: randomUUID,
    code: () => "123456",
    uuid: randomUUID,
    now: () => new Date(),
    send: async (email, code) => {
      emails.set(email, code);
    },
  });
  const characters = characterService({
    repository: mongo.character,
    uuid: randomUUID,
    now: () => new Date(),
    roll: () => 4,
  });
  const assistance = assistanceService({
    repository: memoryProposalRepository(),
    generate: async () => ({
      explanation: "A quiet beginning.",
      command: {
        type: "narrative",
        narrative: "A wanderer under unfamiliar stars.",
      },
      sources: [],
    }),
    getCharacter: characters.get,
    apply: characters.command,
    quota: async () => {},
    uuid: randomUUID,
    now: () => new Date(),
  });
  app = createApp({
    config: readConfig({
      NODE_ENV: "test",
      MONGODB_URI: parsed.toString(),
      SESSION_SECRET: "s".repeat(32),
      APP_ORIGIN: origin,
    }),
    identity,
    characters,
    assistance,
    healthy: mongo.healthy,
  });
}, 25000);

afterAll(async () => {
  if (mongo) {
    await mongo.db.dropDatabase();
    await mongo.close();
  }
  if (processHandle) {
    const handle = processHandle;
    await new Promise<void>((resolve) => {
      if (handle.exitCode !== null) return resolve();
      handle.once("exit", () => resolve());
      handle.kill("SIGTERM");
    });
  }
  if (directory) await rm(directory, { recursive: true, force: true });
}, 15000);

async function actor() {
  const agent = request.agent(app);
  const session = await agent.get("/api/v1/session");
  const csrf = session.body.csrf as string;
  const email = `${randomUUID()}@example.test`;
  function post(path: string, body: object) {
    return agent
      .post(`/api/v1${path}`)
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf)
      .send(body);
  }
  await post("/auth/signup", {
    email,
    username: randomUUID(),
    password,
  }).expect(202);
  return {
    agent,
    post,
    csrf,
    email,
    async verify() {
      return post("/auth/verify", { email, code: emails.get(email) }).expect(
        200,
      );
    },
  };
}

describe("MongoDB and HTTP security integration", () => {
  test("requires email verification and revokes captured sessions after logout", async () => {
    const a = await actor();
    await a.post("/auth/login", { email: a.email, password }).expect(401);
    const login = await a.verify();
    const cookie = (login.headers["set-cookie"] as unknown as string[])
      .find((v) => v.startsWith("scryvant_session="))!
      .split(";")[0]!;
    await a.agent.get("/api/v1/characters").expect(200);
    await a.post("/auth/logout", {}).expect(200);
    await request(app)
      .get("/api/v1/characters")
      .set("Cookie", cookie)
      .expect(401);
  });
  test("accepts UUID IDs, isolates ownership, and rejects stale writes", async () => {
    const a = await actor();
    await a.verify();
    const b = await actor();
    await b.verify();
    const created = await a.post("/characters", fixture()).expect(201);
    const id = created.body.id;
    await a.agent.get(`/api/v1/characters/${id}`).expect(200);
    await b.agent.get(`/api/v1/characters/${id}`).expect(404);
    await b
      .post(`/characters/${id}/commands`, {
        revision: 0,
        command: { type: "heal", amount: 1 },
      })
      .expect(404);
    await a
      .post(`/characters/${id}/commands`, {
        revision: 0,
        command: { type: "damage", amount: 2 },
      })
      .expect(200);
    await a
      .post(`/characters/${id}/commands`, {
        revision: 0,
        command: { type: "heal", amount: 1 },
      })
      .expect(409);
    const saved = await a.agent.get(`/api/v1/characters/${id}`);
    expect(saved.body.state.hp).toBe(6);
    expect(saved.body.history).toHaveLength(1);
  });
  test("rejects missing CSRF, foreign origins, and client-supplied derived values", async () => {
    const a = await actor();
    await a.verify();
    await a.agent.post("/api/v1/characters").send(fixture()).expect(403);
    await a.agent
      .post("/api/v1/characters")
      .set("Origin", "https://attacker.test")
      .set("X-CSRF-Token", a.csrf)
      .send(fixture())
      .expect(403);
    await a
      .post("/characters", { ...fixture(), proficiencyBonus: 99 })
      .expect(400);
  });
  test("password reset is single-use and invalidates every session", async () => {
    const a = await actor();
    await a.verify();
    await a.post("/auth/forgot-password", { email: a.email }).expect(202);
    await a
      .post("/auth/reset-password", {
        email: a.email,
        code: "123456",
        password: "a different long password",
      })
      .expect(200);
    await a.agent.get("/api/v1/characters").expect(401);
    await a
      .post("/auth/reset-password", {
        email: a.email,
        code: "123456",
        password,
      })
      .expect(400);
    await a.post("/auth/login", { email: a.email, password }).expect(401);
  });
  test("OTP attempts and resend cooldown persist in MongoDB", async () => {
    const a = await actor();
    await a.post("/auth/resend", { email: a.email }).expect(429);
    for (let i = 0; i < 5; i++)
      await a
        .post("/auth/verify", { email: a.email, code: "000000" })
        .expect(400);
    await a
      .post("/auth/verify", { email: a.email, code: "123456" })
      .expect(429);
  });
  test("account removal makes existing sessions unusable", async () => {
    const a = await actor();
    const login = await a.verify();
    await mongo.db.collection("users").deleteOne({ _id: login.body.user.id });
    await a.agent.get("/api/v1/characters").expect(401);
  });
  test("AI proposals cannot cross owners or be applied twice", async () => {
    const a = await actor();
    await a.verify();
    const b = await actor();
    await b.verify();
    const created = await a.post("/characters", fixture()).expect(201);
    const id = created.body.id;
    const proposal = await a
      .post(`/characters/${id}/suggestions`, { prompt: "Suggest a backstory." })
      .expect(200);
    await b
      .post(`/characters/${id}/suggestions/${proposal.body.id}/accept`, {})
      .expect(404);
    await a
      .post(`/characters/${id}/suggestions/${proposal.body.id}/accept`, {})
      .expect(200);
    await a
      .post(`/characters/${id}/suggestions/${proposal.body.id}/accept`, {})
      .expect(409);
  });
  test("legacy migration is repeatable, dry-run safe, and preserves original fields", async () => {
    const a = await actor();
    const loggedIn = await a.verify();
    const id = randomUUID();
    const collection = mongo.db.collection<{
      _id: string;
      userId: string;
      name: string;
      class: string;
      level: number;
      schemaVersion?: number;
      legacy?: unknown;
    }>("characters");
    const original = {
      _id: id,
      userId: loggedIn.body.user.id,
      name: "Old adventurer",
      class: "Fighter",
      level: 8,
    };
    await collection.insertOne(original);
    expect((await migrateLegacy(mongo.db)).candidates).toBe(1);
    expect(
      (await collection.findOne({ _id: id }))?.schemaVersion,
    ).toBeUndefined();
    expect((await migrateLegacy(mongo.db, false)).migrated).toBe(1);
    expect((await migrateLegacy(mongo.db, false)).migrated).toBe(0);
    const migrated = await collection.findOne({ _id: id });
    expect(migrated?.level).toBe(8);
    expect(migrated?.legacy).toMatchObject({ name: original.name, level: 8 });
    const list = await a.agent.get("/api/v1/characters").expect(200);
    expect(
      list.body.characters.find((c: { id: string }) => c.id === id)
        .needsCompletion,
    ).toBe(true);
    const choices = { ...fixture(), name: original.name };
    await a
      .post(`/characters/${id}/complete`, {
        choices,
        advancements: [],
        acknowledgeChanges: true,
      })
      .expect(422);
    const advancements = Array.from({ length: 7 }, (_, i) => ({
      level: i + 2,
      hp: 4,
      feat: [4, 8].includes(i + 2) ? "ability-score-improvement" : "",
      boosts: { ...zeroScores(), strength: [4, 8].includes(i + 2) ? 2 : 0 },
    }));
    const completed = await a
      .post(`/characters/${id}/complete`, {
        choices,
        advancements,
        acknowledgeChanges: true,
      })
      .expect(200);
    expect(completed.body.id).toBe(id);
    expect(completed.body.level).toBe(8);
    expect((await collection.findOne({ _id: id }))?.legacy).toMatchObject({
      name: original.name,
      level: 8,
      class: "Fighter",
    });
    await a
      .post(`/characters/${id}/complete`, {
        choices,
        advancements,
        acknowledgeChanges: true,
      })
      .expect(404);
  });
});
