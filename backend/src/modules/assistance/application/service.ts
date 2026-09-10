import type { Character, CharacterCommand, Proposal } from "../../../contracts";
import { applyCommand } from "../../rules/domain/engine";
import { AppError } from "../../../platform/errors";
export type Answer = {
  explanation: string;
  command: CharacterCommand | null;
  sources: { page: number; label: string }[];
};
export interface AssistanceRepository {
  put(owner: string, proposal: Proposal): Promise<void>;
  get(owner: string, id: string): Promise<Proposal | null>;
}
export function assistanceService(d: {
  repository: AssistanceRepository;
  generate: (character: Character, prompt: string) => Promise<Answer>;
  getCharacter: (owner: string, id: string) => Promise<Character>;
  apply: (
    owner: string,
    id: string,
    revision: number,
    command: CharacterCommand,
  ) => Promise<unknown>;
  quota: (owner: string) => Promise<void>;
  uuid: () => string;
  now: () => Date;
}) {
  return {
    async suggest(owner: string, id: string, prompt: string) {
      const c = await d.getCharacter(owner, id);
      await d.quota(owner);
      const answer = await d.generate(c, prompt);
      if (answer.command)
        applyCommand(c, answer.command, () => {
          throw new AppError(422, "AI_COMMAND", "AI cannot roll dice.");
        });
      const p: Proposal = {
        ...answer,
        id: d.uuid(),
        characterId: id,
        revision: c.revision,
        createdAt: d.now().toISOString(),
      };
      await d.repository.put(owner, p);
      return p;
    },
    async accept(owner: string, id: string, characterId: string) {
      const p = await d.repository.get(owner, id);
      if (!p || !p.command || p.characterId !== characterId)
        throw new AppError(404, "NOT_FOUND", "Proposal unavailable.");
      if (d.now().getTime() - new Date(p.createdAt).getTime() > 86400000)
        throw new AppError(409, "EXPIRED", "This suggestion has expired.");
      return d.apply(owner, p.characterId, p.revision, p.command);
    },
  };
}
