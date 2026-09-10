import type { Character, LegacyCharacter, Proposal } from "../contracts";
import type { CharacterRepository } from "../modules/characters/application/service";
import type { AssistanceRepository } from "../modules/assistance/application/service";
export function memoryCharacterRepository(): CharacterRepository {
  const rows = new Map<string, Character>();
  return {
    async list(owner): Promise<(Character | LegacyCharacter)[]> {
      return structuredClone(
        [...rows.values()].filter((c) => c.userId === owner),
      );
    },
    async get(owner, id) {
      const c = rows.get(id);
      return c?.userId === owner ? structuredClone(c) : null;
    },
    async create(c) {
      rows.set(c.id, structuredClone(c));
    },
    async save(c, revision) {
      const old = rows.get(c.id);
      if (!old || old.userId !== c.userId || old.revision !== revision)
        return false;
      rows.set(c.id, structuredClone(c));
      return true;
    },
    async delete(owner, id, revision) {
      const old = rows.get(id);
      return old?.userId === owner && old.revision === revision
        ? rows.delete(id)
        : false;
    },
    async getLegacy() {
      return null;
    },
    async completeLegacy() {
      return false;
    },
  };
}
export function memoryProposalRepository(): AssistanceRepository {
  const rows = new Map<string, { owner: string; proposal: Proposal }>();
  return {
    async put(owner, proposal) {
      rows.set(proposal.id, { owner, proposal: structuredClone(proposal) });
    },
    async get(owner, id) {
      const row = rows.get(id);
      return row?.owner === owner ? structuredClone(row.proposal) : null;
    },
  };
}
