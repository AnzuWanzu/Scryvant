import type {
  Character,
  Advancement,
  CharacterChoices,
  CharacterCommand,
  LegacyCharacter,
} from "../../../contracts";
import { applyCommand, createSheet, derive } from "../../rules/domain/engine";
import { AppError } from "../../../platform/errors";
export interface CharacterRepository {
  list(owner: string): Promise<(Character | LegacyCharacter)[]>;
  get(owner: string, id: string): Promise<Character | null>;
  create(character: Character): Promise<void>;
  save(character: Character, expectedRevision: number): Promise<boolean>;
  delete(owner: string, id: string, revision: number): Promise<boolean>;
  getLegacy(owner: string, id: string): Promise<LegacyCharacter | null>;
  completeLegacy(
    owner: string,
    id: string,
    character: Character,
  ): Promise<boolean>;
}
export function characterService(deps: {
  repository: CharacterRepository;
  uuid: () => string;
  now: () => Date;
  roll: (sides: number) => number;
}) {
  const { repository } = deps;
  async function get(owner: string, id: string) {
    const c = await repository.get(owner, id);
    if (!c) throw new AppError(404, "NOT_FOUND", "Character not found.");
    return c;
  }
  return {
    list: (owner: string) => repository.list(owner),
    get,
    async create(owner: string, choices: CharacterChoices) {
      const c = createSheet(
        deps.uuid(),
        owner,
        choices,
        deps.now().toISOString(),
      );
      await repository.create(c);
      return { ...c, derived: derive(c) };
    },
    async complete(
      owner: string,
      id: string,
      choices: CharacterChoices,
      advancements: Advancement[],
    ) {
      const legacy = await repository.getLegacy(owner, id);
      if (!legacy)
        throw new AppError(404, "NOT_FOUND", "Legacy character not found.");
      const level = Number(legacy.legacy.level ?? 1);
      if (
        !Number.isInteger(level) ||
        level < 1 ||
        level > 20 ||
        advancements.length !== level - 1
      ) {
        throw new AppError(
          422,
          "LEGACY_LEVEL",
          `Reconcile every level of this level ${level} character before completing it.`,
        );
      }
      let c = createSheet(id, owner, choices, deps.now().toISOString());
      for (const advancement of advancements)
        c = applyCommand(c, { type: "level-up", advancement }, deps.roll);
      c.history = [
        {
          at: c.createdAt,
          summary: "Legacy choices reconciled; original record retained",
          revision: 0,
        },
      ];
      if (!(await repository.completeLegacy(owner, id, c)))
        throw new AppError(
          409,
          "CONFLICT",
          "Character was already completed or is unavailable.",
        );
      return { ...c, derived: derive(c) };
    },
    async command(
      owner: string,
      id: string,
      revision: number,
      command: CharacterCommand,
    ) {
      const old = await get(owner, id);
      if (old.revision !== revision)
        throw new AppError(
          409,
          "CONFLICT",
          "This sheet changed elsewhere. Reload before applying this change.",
        );
      const c = applyCommand(old, command, deps.roll);
      c.revision++;
      c.updatedAt = deps.now().toISOString();
      c.history = [
        { at: c.updatedAt, summary: command.type, revision: c.revision },
        ...old.history,
      ].slice(0, 100);
      if (!(await repository.save(c, revision)))
        throw new AppError(
          409,
          "CONFLICT",
          "This sheet changed elsewhere. Reload before applying this change.",
        );
      return { ...c, derived: derive(c) };
    },
    async delete(owner: string, id: string, revision: number) {
      if (!(await repository.delete(owner, id, revision)))
        throw new AppError(
          409,
          "CONFLICT",
          "Character unavailable or changed. Reload before deleting.",
        );
    },
  };
}
