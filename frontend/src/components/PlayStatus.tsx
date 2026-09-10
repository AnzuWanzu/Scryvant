import { useState } from "react";
import type { CharacterCommand, CharacterView } from "../lib/types";

export function PlayStatus({
  character,
  busy,
  onCommand,
}: {
  character: CharacterView;
  busy: boolean;
  onCommand: (command: CharacterCommand) => Promise<void>;
}) {
  const [roll, setRoll] = useState(10);
  const { state } = character;
  return (
    <section className="play-status" aria-label="Survival and concentration">
      <label>
        Exhaustion
        <select
          aria-label="Exhaustion level"
          value={state.exhaustion}
          disabled={busy}
          onChange={(event) =>
            void onCommand({
              type: "conditions",
              conditions: state.conditions,
              exhaustion: Number(event.target.value),
            })
          }
        >
          {Array.from({ length: 7 }, (_, level) => (
            <option key={level} value={level}>
              {level === 0 ? "None" : `Level ${level}`}
            </option>
          ))}
        </select>
      </label>
      <div>
        <strong>Concentration</strong>
        <p>
          {state.concentration
            ? state.concentration.replaceAll("-", " ")
            : "No active spell"}
        </p>
        {state.concentration && (
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              void onCommand({ type: "concentration", spellId: null })
            }
          >
            End concentration
          </button>
        )}
      </div>
      {state.hp === 0 && (
        <div className="death-saves">
          <strong>Death saving throws</strong>
          <p aria-live="polite">
            {state.deathSaves.success} successes · {state.deathSaves.failure}{" "}
            failures
          </p>
          <label>
            Recorded d20 roll
            <input
              aria-label="Death save roll"
              type="number"
              min={1}
              max={20}
              value={roll}
              onChange={(event) => setRoll(Number(event.target.value))}
            />
          </label>
          <button
            className="secondary-button"
            disabled={
              busy ||
              !Number.isInteger(roll) ||
              roll < 1 ||
              roll > 20 ||
              state.deathSaves.failure >= 3 ||
              state.deathSaves.success >= 3
            }
            onClick={() => void onCommand({ type: "death-save", roll })}
          >
            Record death save
          </button>
        </div>
      )}
    </section>
  );
}
