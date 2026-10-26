import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Modal } from "./Modal";
import type {
  Ability,
  Catalog,
  CharacterCommand,
  CharacterView,
  Scores,
} from "../lib/types";
const abilities: Ability[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
export function LevelUp({
  character: c,
  onClose,
  onCommand,
  classRule,
  feats,
}: {
  character: CharacterView;
  onClose: () => void;
  onCommand: (c: CharacterCommand) => Promise<void>;
  classRule: Catalog["classes"][number];
  feats: Catalog["feats"];
}) {
  const next = c.level + 1;
  const die = classRule.die;
  const hasFeat = [
    4,
    8,
    12,
    16,
    19,
    ...(c.choices.classId === "fighter" ? [6, 14] : []),
    ...(c.choices.classId === "rogue" ? [10] : []),
  ].includes(next);
  const [hp, setHp] = useState(die / 2 + 1);
  const [feat, setFeat] = useState(
    next === 19 ? "boon-of-combat-prowess" : "ability-score-improvement",
  );
  const [boosts, setBoosts] = useState<Scores>({
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  });
  const selected = feats.find((f) => f.id === feat);
  return (
    <Modal title={`Chapter ${next}. Your legend grows.`} onClose={onClose}>
      <label>
        Hit Point gain (before Constitution modifier)
        <input
          type="number"
          min={1}
          max={die}
          value={hp}
          onChange={(e) => setHp(Number(e.target.value))}
        />
        <small>
          Use the fixed value {die / 2 + 1}, or record a d{die} roll.
        </small>
      </label>
      {next === 3 && (
        <section className="subclass-choice">
          <span className="eyebrow">YOUR DEFINING PATH</span>
          <label>
            Subclass path
            <select value={classRule.subclassId} disabled>
              <option value={classRule.subclassId}>{classRule.subclass}</option>
            </select>
          </label>
          <p className="muted">
            The SRD 5.2.1 provides this supported {classRule.name} subclass. Its
            features unlock only after this choice is recorded.
          </p>
        </section>
      )}
      {hasFeat && (
        <>
          <label>
            Advancement feat
            <select
              aria-label="Advancement feat"
              value={feat}
              onChange={(e) => setFeat(e.target.value)}
            >
              {feats
                .filter(
                  (f) =>
                    f.category === "General" ||
                    (next === 19 && f.category === "Epic Boon"),
                )
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="muted">
            Assign{" "}
            {feat === "ability-score-improvement"
              ? "two ability points, maximum 20"
              : "one ability point; follow the feat’s eligible abilities and score maximum"}
            .
          </p>
          <div className="ability-editor">
            {abilities.map((a) => (
              <label key={a}>
                {a.slice(0, 3)}
                <input
                  type="number"
                  min={0}
                  max={2}
                  value={boosts[a]}
                  onChange={(e) =>
                    setBoosts({ ...boosts, [a]: Number(e.target.value) })
                  }
                />
              </label>
            ))}
          </div>
          {selected && (
            <details className="feature-entry">
              <summary>Read {selected.name}</summary>
              <p>{selected.text}</p>
            </details>
          )}
        </>
      )}
      <button
        className="button primary"
        onClick={() => {
          void onCommand({
            type: "level-up",
            advancement: {
              level: next,
              boosts,
              feat: hasFeat ? feat : "",
              hp,
              subclassId: next === 3 ? classRule.subclassId : undefined,
            },
          });
          onClose();
        }}
      >
        Advance to level {next}
        <ArrowUpRight size={16} />
      </button>
    </Modal>
  );
}
