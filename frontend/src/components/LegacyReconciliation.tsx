import type { Advancement, Catalog, LegacyCharacter } from "../lib/types";
export function LegacyReconciliation({
  legacy,
  catalog,
  classId,
  advancements,
  onChange,
  acknowledged,
  onAcknowledge,
}: {
  legacy: LegacyCharacter;
  catalog: Catalog;
  classId: string;
  advancements: Advancement[];
  onChange: (next: Advancement[]) => void;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
}) {
  function update(index: number, patch: Partial<Advancement>) {
    onChange(
      advancements.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  }
  const cls = catalog.classes.find((c) => c.id === classId)!;
  return (
    <section className="legacy-review">
      <h3>Keep the old chapter intact.</h3>
      <p className="muted">
        Original: {legacy.name} · Level {String(legacy.legacy.level ?? 1)}{" "}
        {String(legacy.legacy.class ?? "unknown class")}. Your original record
        remains archived. Review every level below before confirming the new
        rules choices.
      </p>
      {advancements.map((a, index) => {
        const featLevel = [
          4,
          8,
          12,
          16,
          19,
          ...(classId === "fighter" ? [6, 14] : []),
          ...(classId === "rogue" ? [10] : []),
        ].includes(a.level);
        return (
          <details className="feature-entry" key={a.level}>
            <summary>
              Level {a.level} · review Hit Points{featLevel ? " and feat" : ""}
            </summary>
            <label>
              Hit Point roll or fixed value
              <input
                type="number"
                min={1}
                max={cls.die}
                value={a.hp}
                onChange={(e) => update(index, { hp: Number(e.target.value) })}
              />
              <small>
                Fixed value: {cls.die / 2 + 1}, before Constitution.
              </small>
            </label>
            {featLevel && (
              <>
                <label>
                  Feat
                  <select
                    value={a.feat}
                    onChange={(e) => update(index, { feat: e.target.value })}
                  >
                    <option value="">Choose a feat…</option>
                    {catalog.feats
                      .filter(
                        (f) =>
                          f.category === "General" ||
                          (a.level === 19 && f.category === "Epic Boon"),
                      )
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="ability-editor">
                  {catalog.abilities.map((ability) => (
                    <label key={ability}>
                      {ability.slice(0, 3)}
                      <input
                        type="number"
                        min={0}
                        max={2}
                        value={a.boosts[ability]}
                        onChange={(e) =>
                          update(index, {
                            boosts: {
                              ...a.boosts,
                              [ability]: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </>
            )}
          </details>
        );
      })}
      <label className="check-choice">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
        />
        I reviewed the replacement rules choices and understand the original
        record is retained.
      </label>
    </section>
  );
}
