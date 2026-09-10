import {
  commandSchema,
  choicesSchema,
} from "../../../backend/src/modules/characters/application/schemas";
import {
  applyCommand,
  createSheet,
  derive,
} from "../../../backend/src/modules/rules/domain/engine";
import type {
  CharacterChoices,
  CharacterCommand,
  CharacterView,
} from "./types";
function roll(sides: number) {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(4294967296 / sides) * sides;
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0]! >= limit);
  return (bytes[0]! % sides) + 1;
}
export function updatePreview(
  old: CharacterView,
  command: CharacterCommand,
): CharacterView {
  const c = applyCommand(old, commandSchema.parse(command), roll);
  c.revision++;
  c.updatedAt = new Date().toISOString();
  c.history = [
    { at: c.updatedAt, summary: command.type, revision: c.revision },
    ...old.history,
  ].slice(0, 100);
  return { ...c, derived: derive(c) };
}
export function createPreview(choices: CharacterChoices): CharacterView {
  const c = createSheet(
    "preview",
    "preview",
    choicesSchema.parse(choices),
    new Date().toISOString(),
  );
  return { ...c, derived: derive(c) };
}
