import { useState } from "react";
import { Backpack, Check, Save, X } from "lucide-react";
import type {
  Catalog,
  CharacterCommand,
  CharacterView,
  InventoryEntry,
} from "../lib/types";

export function Inventory({
  character,
  catalog,
  busy,
  onCommand,
}: {
  character: CharacterView;
  catalog: Catalog | null;
  busy: boolean;
  onCommand: (command: CharacterCommand) => Promise<void>;
}) {
  const [items, setItems] = useState<InventoryEntry[]>(
    character.state.inventory,
  );
  const [gold, setGold] = useState(character.state.gold);
  const [dirty, setDirty] = useState(false);

  function update(next: InventoryEntry[]) {
    setItems(next);
    setDirty(true);
  }

  async function save() {
    await onCommand({ type: "inventory", items, gold });
  }

  return (
    <>
      <div className="section-title">
        <h2>Tools of the journey</h2>
        <span className="pill gold-text">{gold} GP</span>
      </div>
      <div className="inventory-ledger">
        <label>
          Coin purse
          <span>
            <input
              aria-label="Gold pieces"
              type="number"
              min={0}
              max={10000000}
              value={gold}
              onChange={(event) => {
                setGold(Number(event.target.value));
                setDirty(true);
              }}
            />
            <small>GP</small>
          </span>
        </label>
        <button
          className="button primary small"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          <Save size={14} />
          Save inventory
        </button>
      </div>
      {items.length === 0 && (
        <p className="empty-inline">Your pack is ready for its first item.</p>
      )}
      {items.map((item) => {
        const rule = catalog?.equipment.find((entry) => entry.id === item.id);
        return (
          <div className="inventory-row" key={item.id}>
            <Backpack size={19} />
            <span>
              <strong>{rule?.name ?? item.id.replaceAll("-", " ")}</strong>
              <small>
                {rule ? `${rule.category} · ${rule.kind}` : "Equipment"}
              </small>
            </span>
            <label className="quantity-field">
              <span>Qty</span>
              <input
                aria-label={`${rule?.name ?? item.id} quantity`}
                type="number"
                min={1}
                max={1000}
                value={item.quantity}
                onChange={(event) =>
                  update(
                    items.map((entry) =>
                      entry.id === item.id
                        ? { ...entry, quantity: Number(event.target.value) }
                        : entry,
                    ),
                  )
                }
              />
            </label>
            <button
              className={`button small ${item.equipped ? "selected" : ""}`}
              disabled={busy}
              onClick={() =>
                update(
                  items.map((entry) =>
                    entry.id === item.id
                      ? { ...entry, equipped: !entry.equipped }
                      : entry,
                  ),
                )
              }
            >
              {item.equipped ? (
                <>
                  <Check size={13} /> Equipped
                </>
              ) : (
                "Equip"
              )}
            </button>
            <button
              className="icon-button"
              aria-label={`Remove ${rule?.name ?? item.id}`}
              disabled={busy}
              onClick={() =>
                update(items.filter((entry) => entry.id !== item.id))
              }
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
      <label className="add-equipment">
        Add equipment
        <select
          aria-label="Add equipment"
          value=""
          disabled={busy}
          onChange={(event) => {
            if (!event.target.value) return;
            update([
              ...items,
              { id: event.target.value, quantity: 1, equipped: false },
            ]);
          }}
        >
          <option value="">Choose from the compendium…</option>
          {catalog?.equipment
            .filter((entry) => !items.some((item) => item.id === entry.id))
            .map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
        </select>
      </label>
      {dirty && (
        <p className="inventory-unsaved" role="status">
          Inventory has unsaved changes.
        </p>
      )}
    </>
  );
}
