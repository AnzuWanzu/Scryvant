import { NodeIO } from "@gltf-transform/core";
import { prune } from "@gltf-transform/functions";
import { readdir, stat } from "node:fs/promises";
const directory = new URL("../frontend/public/models/", import.meta.url);
const io = new NodeIO();
for (const name of await readdir(directory)) {
  if (!name.endsWith(".glb")) continue;
  const path = new URL(name, directory).pathname;
  const before = (await stat(path)).size;
  const document = await io.read(path);
  for (const animation of document.getRoot().listAnimations()) {
    if (!["Idle", "Spellcasting"].includes(animation.getName()))
      animation.dispose();
  }
  await document.transform(prune());
  await io.write(path, document);
  console.log(`${name}: ${before} → ${(await stat(path)).size} bytes`);
}
