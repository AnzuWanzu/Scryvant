import type { CharacterCommand } from "../lib/types";
export function ProposalPreview({ command }: { command: CharacterCommand }) {
  switch (command.type) {
    case "narrative":
      return (
        <blockquote className="proposal-preview">
          <strong>Replace backstory</strong>
          <p>{command.narrative}</p>
        </blockquote>
      );
    case "notes":
      return (
        <blockquote className="proposal-preview">
          <strong>Replace adventure notes</strong>
          <p>{command.notes}</p>
        </blockquote>
      );
    case "damage":
      return <p className="proposal-preview">Take {command.amount} damage.</p>;
    case "heal":
      return (
        <p className="proposal-preview">
          Recover up to {command.amount} hit points.
        </p>
      );
    case "temp-hp":
      return (
        <p className="proposal-preview">
          Grant {command.amount} temporary hit points.
        </p>
      );
    case "appearance":
      return (
        <p className="proposal-preview">
          Change your miniature to the {command.appearance.palette} palette with
          a {command.appearance.accessory}.
        </p>
      );
    case "spells":
      return (
        <p className="proposal-preview">
          Replace your selected spells with:{" "}
          {command.spells.map((s) => s.replaceAll("-", " ")).join(", ") ||
            "none"}
          .
        </p>
      );
    default:
      return (
        <p className="proposal-preview">
          Review this {command.type.replaceAll("-", " ")} change before
          accepting.
        </p>
      );
  }
}
