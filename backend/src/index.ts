import "dotenv/config";
import { readConfig } from "./platform/config";
import { compose } from "./platform/composition";
async function main() {
  const config = readConfig(process.env);
  const runtime = await compose(config);
  const server = runtime.app.listen(config.PORT, () =>
    console.log(`Scryvant listening on ${config.PORT}`),
  );
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      void runtime.close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
main().catch(() => {
  console.error(
    "Startup failed. Check configuration and database availability.",
  );
  process.exitCode = 1;
});
