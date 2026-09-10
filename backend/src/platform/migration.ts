import type { Db } from "mongodb";
/** Keeps original fields intact. Version 1 is deliberately not a playable rules-validated sheet. */
export async function migrateLegacy(db: Db, dryRun = true) {
  const collection = db.collection("characters");
  const cursor = collection.find({ schemaVersion: { $exists: false } });
  let candidates = 0;
  let migrated = 0;
  for await (const document of cursor) {
    candidates++;
    if (dryRun) continue;
    const { _id, ...original } = document;
    const result = await collection.updateOne(
      { _id, schemaVersion: { $exists: false } },
      { $set: { schemaVersion: 1, legacy: original, needsCompletion: true } },
    );
    migrated += result.modifiedCount;
  }
  return { dryRun, candidates, migrated };
}
