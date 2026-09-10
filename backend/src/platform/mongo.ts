import mongoose from "mongoose";
import type {
  Account,
  IdentityRepository,
  Session,
} from "../modules/identity/application/service";
import type { Character, LegacyCharacter } from "../contracts";
import type { CharacterRepository } from "../modules/characters/application/service";
export async function mongoAdapters(uri: string) {
  const connection = await mongoose.createConnection(uri).asPromise();
  const db = connection.db!;
  type UserDocument = Omit<Account, "id"> & { _id: string };
  const users = db.collection<UserDocument>("users");
  const sessions = db.collection<Session & { _id: string }>("sessions");
  const challenges = db.collection<{
    _id: string;
    hash: string;
    expiresAt: Date;
  }>("challenges");
  const limits = db.collection<{ _id: string; count: number; expiresAt: Date }>(
    "limits",
  );
  type CharDocument = {
    _id: string;
    userId: string;
    schemaVersion?: number;
    revision?: number;
    data?: Character;
    name?: string;
    legacy?: Record<string, unknown>;
  };
  const characters = db.collection<CharDocument>("characters");
  await Promise.all([
    users.createIndex({ email: 1 }, { unique: true }),
    users.createIndex({ username: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1 }),
    challenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    limits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    characters.createIndex({ userId: 1 }),
  ]);
  const account = (u: UserDocument | null): Account | null =>
    u
      ? {
          id: u._id,
          username: u.username,
          email: u.email,
          password: u.password,
          isVerified: u.isVerified,
          authVersion: u.authVersion ?? 0,
        }
      : null;
  const identity: IdentityRepository = {
    find: async (email) => account(await users.findOne({ email })),
    get: async (id) => account(await users.findOne({ _id: id })),
    async create(a) {
      try {
        const { id, ...rest } = a;
        await users.insertOne({ _id: id, ...rest });
        return true;
      } catch (e) {
        if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000)
          return false;
        throw e;
      }
    },
    async challenge(userId, kind, hash, expiresAt) {
      await challenges.updateOne(
        { _id: `${userId}:${kind}` },
        { $set: { hash, expiresAt } },
        { upsert: true },
      );
    },
    async consume(userId, kind, hash, now) {
      return !!(await challenges.findOneAndDelete({
        _id: `${userId}:${kind}`,
        hash,
        expiresAt: { $gt: now },
      }));
    },
    async verify(id) {
      await users.updateOne(
        { _id: id },
        { $set: { isVerified: true }, $unset: { otp: "", otpExpires: "" } },
      );
    },
    async reset(id, password) {
      await users.updateOne(
        { _id: id },
        { $set: { password }, $inc: { authVersion: 1 } },
      );
      await sessions.deleteMany({ userId: id });
    },
    async session(s) {
      await sessions.insertOne({ _id: s.hash, ...s });
    },
    readSession: (hash) => sessions.findOne({ _id: hash }),
    async revoke(hash) {
      await sessions.deleteOne({ _id: hash });
    },
    async throttle(key, limit, windowMs, now) {
      const bucket = Math.floor(now.getTime() / windowMs);
      const row = await limits.findOneAndUpdate(
        { _id: `${key}:${bucket}` },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
        },
        { upsert: true, returnDocument: "after" },
      );
      return row!.count <= limit;
    },
  };
  const legacy = (doc: CharDocument): LegacyCharacter => ({
    id: doc._id,
    name: doc.name ?? "Unfinished character",
    needsCompletion: true,
    legacy:
      doc.legacy ??
      Object.fromEntries(
        Object.entries(doc).filter(([k]) => !["_id", "userId"].includes(k)),
      ),
  });
  const character: CharacterRepository = {
    async list(owner) {
      return (
        await characters
          .find({ userId: owner })
          .sort({ _id: 1 })
          .limit(100)
          .toArray()
      ).map((d) => d.data ?? legacy(d));
    },
    async get(owner, id) {
      return (
        (await characters.findOne({ _id: id, userId: owner, schemaVersion: 2 }))
          ?.data ?? null
      );
    },
    async create(c) {
      await characters.insertOne({
        _id: c.id,
        userId: c.userId,
        schemaVersion: 2,
        revision: c.revision,
        data: c,
      });
    },
    async save(c, revision) {
      const result = await characters.updateOne(
        { _id: c.id, userId: c.userId, revision },
        { $set: { data: c, revision: c.revision } },
      );
      return result.modifiedCount === 1;
    },
    async delete(owner, id, revision) {
      return (
        (await characters.deleteOne({ _id: id, userId: owner, revision }))
          .deletedCount === 1
      );
    },
    async getLegacy(owner, id) {
      const doc = await characters.findOne({
        _id: id,
        userId: owner,
        schemaVersion: { $ne: 2 },
      });
      return doc ? legacy(doc) : null;
    },
    async completeLegacy(owner, id, c) {
      return (
        (
          await characters.updateOne(
            { _id: id, userId: owner, schemaVersion: { $ne: 2 } },
            { $set: { schemaVersion: 2, revision: 0, data: c } },
          )
        ).modifiedCount === 1
      );
    },
  };
  return {
    identity,
    character,
    db,
    close: () => connection.close(),
    healthy: () => connection.readyState === 1,
  };
}
