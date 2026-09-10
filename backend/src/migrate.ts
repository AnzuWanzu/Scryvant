import "dotenv/config";
import { mongoAdapters } from "./platform/mongo";
import { migrateLegacy } from "./platform/migration";

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) {
    throw new Error(
      "Usage: npm run migrate -- [--apply]. Defaults to dry run.",
    );
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required.");
  const mongo = await mongoAdapters(uri);
  try {
    console.log(
      JSON.stringify(await migrateLegacy(mongo.db, !args.includes("--apply"))),
    );
  } finally {
    await mongo.close();
  }
}

main().catch(() => {
  console.error(
    "Migration failed. Check database access and arguments; no credentials are logged.",
  );
  process.exitCode = 1;
});
