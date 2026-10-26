import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Modal } from "./Modal";
import { LegacyReconciliation } from "./LegacyReconciliation";
import type {
  Catalog,
  CharacterChoices,
  Scores,
  Ability,
  LegacyCharacter,
  Advancement,
  SpeciesOptions,
  ClassOptions,
} from "../lib/types";
const zero: Scores = {
  strength: 0,
  dexterity: 0,
  constitution: 0,
  intelligence: 0,
  wisdom: 0,
  charisma: 0,
};
const initial: CharacterChoices = {
  name: "",
  classId: "wizard",
  speciesId: "elf",
  speciesOptions: {
    heritage: "high-elf",
    spellAbility: "intelligence",
    skill: "Perception",
  },
  classOptions: { expertise: [] },
  backgroundId: "sage",
  startingEquipment: "package",
  method: "standard",
  baseScores: {
    strength: 8,
    dexterity: 14,
    constitution: 13,
    intelligence: 15,
    wisdom: 12,
    charisma: 10,
  },
  boosts: { ...zero, intelligence: 2, constitution: 1 },
  skills: ["Insight", "Investigation"],
  spells: [],
  narrative: "",
  appearance: { palette: "jade", accessory: "staff" },
};
const title = (value: string) =>
  value
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
export function Creator({
  catalog,
  onClose,
  onCreate,
  legacy,
}: {
  catalog: Catalog;
  onClose: () => void;
  onCreate: (v: CharacterChoices, advancements: Advancement[]) => Promise<void>;
  legacy?: LegacyCharacter | undefined;
}) {
  const [value, setValue] = useState({ ...initial, name: legacy?.name ?? "" });
  const [acknowledged, setAcknowledged] = useState(false);
  const [advancements, setAdvancements] = useState<Advancement[]>(
    Array.from(
      {
        length: Math.max(
          0,
          Math.min(19, Number(legacy?.legacy.level ?? 1) - 1),
        ),
      },
      (_, i) => ({ level: i + 2, boosts: { ...zero }, feat: "", hp: 4 }),
    ),
  );
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cls = catalog.classes.find((c) => c.id === value.classId)!;
  const bg = catalog.backgrounds.find((b) => b.id === value.backgroundId)!;
  const speciesRule = catalog.species.find(
    (species) => species.id === value.speciesId,
  )!;
  function speciesOptionsFor(
    rule: Catalog["species"][number],
    background: Catalog["backgrounds"][number],
    preferred: SpeciesOptions = rule.defaults,
  ): SpeciesOptions {
    const options = { ...rule.defaults, ...preferred };
    if (rule.choices.skills) {
      options.skill = rule.choices.skills.find(
        (skill) =>
          skill === options.skill && !background.skills.includes(skill),
      );
      options.skill ??= rule.choices.skills.find(
        (skill) => !background.skills.includes(skill),
      );
    }
    if (rule.choices.originFeats) {
      const backgroundFeat = catalog.feats.find((feat) =>
        background.feat.toLowerCase().startsWith(feat.name.toLowerCase()),
      )?.id;
      options.originFeat = rule.choices.originFeats.find(
        (feat) => feat === options.originFeat && feat !== backgroundFeat,
      );
      options.originFeat ??= rule.choices.originFeats.find(
        (feat) => feat !== backgroundFeat,
      );
    }
    return options;
  }
  function classSkills(
    classRule: Catalog["classes"][number],
    background: Catalog["backgrounds"][number],
    speciesSkill?: string,
  ) {
    return classRule.skills
      .filter(
        (skill) => !background.skills.includes(skill) && skill !== speciesSkill,
      )
      .slice(0, classRule.skillCount);
  }
  function classOptionsFor(
    classRule: Catalog["classes"][number],
    selectedSkills: string[],
    background: Catalog["backgrounds"][number],
    speciesSkill?: string,
    preferred: ClassOptions = { expertise: [] },
  ): ClassOptions {
    const trained = [
      ...selectedSkills,
      ...background.skills,
      ...(speciesSkill ? [speciesSkill] : []),
    ];
    const expertiseCount = classRule.initialExpertise ?? 0;
    const expertise = [
      ...preferred.expertise.filter((skill) => trained.includes(skill)),
      ...trained.filter((skill) => !preferred.expertise.includes(skill)),
    ].slice(0, expertiseCount);
    const fightingStyle = classRule.fightingStyles?.includes(
      preferred.fightingStyle ?? "",
    )
      ? preferred.fightingStyle
      : classRule.fightingStyles?.[0];
    return { expertise, fightingStyle };
  }
  function change<K extends keyof CharacterChoices>(
    key: K,
    v: CharacterChoices[K],
  ) {
    setValue((old) => ({ ...old, [key]: v }));
  }
  const steps = ["Identity", "Abilities", "Proficiencies", "Your story"];
  async function finish() {
    setBusy(true);
    setError("");
    try {
      await onCreate(value, advancements);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Give your legend a beginning." onClose={onClose} wide>
      <nav className="wizard-steps" aria-label="Character creation steps">
        {steps.map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
          >
            <span>{i < step ? <Check size={12} /> : i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      <div className="creation-content">
        {step === 0 && (
          <>
            <label>
              Character name
              <input
                value={value.name}
                placeholder="What will the bards call you?"
                maxLength={50}
                onChange={(e) => change("name", e.target.value)}
              />
            </label>
            <div className="form-grid">
              <label>
                Class
                <select
                  value={value.classId}
                  onChange={(e) => {
                    const c = catalog.classes.find(
                      (c) => c.id === e.target.value,
                    )!;
                    const skills = classSkills(
                      c,
                      bg,
                      value.speciesOptions.skill,
                    );
                    setValue((v) => ({
                      ...v,
                      classId: c.id,
                      skills,
                      classOptions: classOptionsFor(
                        c,
                        skills,
                        bg,
                        v.speciesOptions.skill,
                      ),
                      spells: [],
                      appearance: {
                        ...v.appearance,
                        accessory: c.caster === "none" ? "sword" : "staff",
                      },
                    }));
                  }}
                >
                  {catalog.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <small>
                  d{cls.die} Hit Die · {cls.subclass} at level 3
                </small>
              </label>
              <label>
                Species
                <select
                  value={value.speciesId}
                  onChange={(e) => {
                    const selected = catalog.species.find(
                      (species) => species.id === e.target.value,
                    )!;
                    const speciesOptions = speciesOptionsFor(selected, bg);
                    const skills = classSkills(cls, bg, speciesOptions.skill);
                    setValue((old) => ({
                      ...old,
                      speciesId: selected.id,
                      speciesOptions,
                      skills,
                      classOptions: classOptionsFor(
                        cls,
                        skills,
                        bg,
                        speciesOptions.skill,
                        old.classOptions,
                      ),
                    }));
                  }}
                >
                  {catalog.species.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <small>
                  {speciesRule.speed}-foot speed · SRD page {speciesRule.page}
                </small>
              </label>
              <label>
                Background
                <select
                  value={value.backgroundId}
                  onChange={(e) => {
                    const b = catalog.backgrounds.find(
                      (b) => b.id === e.target.value,
                    )!;
                    const boosts = {
                      ...zero,
                      [b.abilities[0]!]: 2,
                      [b.abilities[1]!]: 1,
                    };
                    const speciesOptions = speciesOptionsFor(
                      speciesRule,
                      b,
                      value.speciesOptions,
                    );
                    const skills = classSkills(cls, b, speciesOptions.skill);
                    setValue((v) => ({
                      ...v,
                      backgroundId: b.id,
                      boosts,
                      speciesOptions,
                      skills,
                      classOptions: classOptionsFor(
                        cls,
                        skills,
                        b,
                        speciesOptions.skill,
                        v.classOptions,
                      ),
                    }));
                  }}
                >
                  {catalog.backgrounds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <small>
                  {bg.feat} · {bg.skills.join(", ")}
                </small>
              </label>
              <label>
                Background equipment
                <select
                  value={value.startingEquipment ?? "package"}
                  onChange={(e) =>
                    change(
                      "startingEquipment",
                      e.target.value as "package" | "gold",
                    )
                  }
                >
                  <option value="package">
                    Equipment package + {bg.gold} GP
                  </option>
                  <option value="gold">50 GP to choose your own gear</option>
                </select>
                <small>
                  {value.startingEquipment === "gold"
                    ? "Begin with an empty pack and 50 GP."
                    : bg.equipment
                        .map(
                          (item) =>
                            `${item.quantity > 1 ? `${item.quantity}× ` : ""}${catalog.equipment.find((entry) => entry.id === item.id)?.name ?? item.id}`,
                        )
                        .join(", ")}
                </small>
              </label>
              <section
                className="species-origin"
                aria-labelledby="species-options-title"
              >
                <div>
                  <strong id="species-options-title">
                    {speciesRule.name} traits
                  </strong>
                  <small>{speciesRule.traitSummary}</small>
                </div>
                <div className="species-choice-grid">
                  {speciesRule.choices.heritages && (
                    <label>
                      {speciesRule.heritageLabel ?? "Heritage"}
                      <select
                        value={value.speciesOptions.heritage}
                        onChange={(e) =>
                          change("speciesOptions", {
                            ...value.speciesOptions,
                            heritage: e.target.value,
                          })
                        }
                      >
                        {speciesRule.choices.heritages.map((heritage) => (
                          <option key={heritage} value={heritage}>
                            {title(heritage)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {speciesRule.choices.spellAbilities && (
                    <label>
                      Innate spell ability
                      <select
                        value={value.speciesOptions.spellAbility}
                        onChange={(e) =>
                          change("speciesOptions", {
                            ...value.speciesOptions,
                            spellAbility: e.target.value as Ability,
                          })
                        }
                      >
                        {speciesRule.choices.spellAbilities.map((ability) => (
                          <option key={ability} value={ability}>
                            {title(ability)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {speciesRule.choices.skills && (
                    <label>
                      Species skill
                      <select
                        value={value.speciesOptions.skill}
                        onChange={(e) => {
                          const skill = e.target.value;
                          setValue((old) => {
                            const skills = classSkills(cls, bg, skill);
                            return {
                              ...old,
                              speciesOptions: {
                                ...old.speciesOptions,
                                skill,
                              },
                              skills,
                              classOptions: classOptionsFor(
                                cls,
                                skills,
                                bg,
                                skill,
                                old.classOptions,
                              ),
                            };
                          });
                        }}
                      >
                        {speciesRule.choices.skills
                          .filter((skill) => !bg.skills.includes(skill))
                          .map((skill) => (
                            <option key={skill} value={skill}>
                              {skill}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  {speciesRule.choices.sizes && (
                    <label>
                      Size
                      <select
                        value={value.speciesOptions.size}
                        onChange={(e) =>
                          change("speciesOptions", {
                            ...value.speciesOptions,
                            size: e.target.value as "small" | "medium",
                          })
                        }
                      >
                        {speciesRule.choices.sizes.map((size) => (
                          <option key={size} value={size}>
                            {title(size)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {speciesRule.choices.originFeats && (
                    <label>
                      Versatile Origin feat
                      <select
                        value={value.speciesOptions.originFeat}
                        onChange={(e) =>
                          change("speciesOptions", {
                            ...value.speciesOptions,
                            originFeat: e.target.value,
                          })
                        }
                      >
                        {speciesRule.choices.originFeats
                          .filter(
                            (featId) =>
                              !bg.feat
                                .toLowerCase()
                                .startsWith(
                                  catalog.feats
                                    .find((feat) => feat.id === featId)!
                                    .name.toLowerCase(),
                                ),
                          )
                          .map((featId) => (
                            <option key={featId} value={featId}>
                              {catalog.feats.find((feat) => feat.id === featId)
                                ?.name ?? title(featId)}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>
              </section>
            </div>
            <div className="quiet-callout">
              <Sparkles size={18} />
              <p>
                Start at level 1. Your class features grow with you, one
                adventure at a time.
              </p>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="section-title">
              <h3>What makes you extraordinary?</h3>
              <select
                aria-label="Ability assignment method"
                value={value.method}
                onChange={(e) =>
                  change("method", e.target.value as CharacterChoices["method"])
                }
              >
                <option value="standard">Standard array</option>
                <option value="point-buy">Point buy</option>
                <option value="rolled">Recorded rolls</option>
              </select>
            </div>
            <p className="muted">
              {value.method === "standard"
                ? "Use 15, 14, 13, 12, 10, and 8 once each."
                : value.method === "point-buy"
                  ? "Spend up to 27 points. Scores range from 8 to 15."
                  : "Record your six ability rolls, between 3 and 18."}{" "}
              Add background bonuses of +2/+1 or +1/+1/+1.
            </p>
            <div className="ability-editor">
              {catalog.abilities.map((a: string) => (
                <label key={a}>
                  {a}
                  <input
                    aria-label={`${a} base score`}
                    type="number"
                    min={3}
                    max={18}
                    value={value.baseScores[a as Ability]}
                    onChange={(e) =>
                      change("baseScores", {
                        ...value.baseScores,
                        [a]: Number(e.target.value),
                      })
                    }
                  />
                  <select
                    aria-label={`${a} background bonus`}
                    value={value.boosts[a as Ability]}
                    onChange={(e) =>
                      change("boosts", {
                        ...value.boosts,
                        [a]: Number(e.target.value),
                      })
                    }
                    disabled={!bg.abilities.includes(a)}
                  >
                    <option value={0}>+0</option>
                    <option value={1}>+1</option>
                    <option value={2}>+2</option>
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h3>A particular set of skills.</h3>
            <p className="muted">
              Choose {cls.skillCount} class skills. Your background already
              grants {bg.skills.join(" and ")}
              {value.speciesOptions.skill
                ? `, and your species grants ${value.speciesOptions.skill}.`
                : "."}
            </p>
            <div className="choice-grid">
              {cls.skills
                .filter(
                  (s) =>
                    !bg.skills.includes(s) && s !== value.speciesOptions.skill,
                )
                .map((s) => (
                  <label className="check-choice" key={s}>
                    <input
                      type="checkbox"
                      checked={value.skills.includes(s)}
                      disabled={
                        !value.skills.includes(s) &&
                        value.skills.length >= cls.skillCount
                      }
                      onChange={(e) =>
                        setValue((old) => {
                          const skills = e.target.checked
                            ? [...old.skills, s]
                            : old.skills.filter((value) => value !== s);
                          return {
                            ...old,
                            skills,
                            classOptions: classOptionsFor(
                              cls,
                              skills,
                              bg,
                              old.speciesOptions.skill,
                              old.classOptions,
                            ),
                          };
                        })
                      }
                    />
                    {s}
                  </label>
                ))}
            </div>
            {cls.fightingStyles && (
              <div className="training-choice">
                <label>
                  Fighting Style
                  <select
                    value={value.classOptions.fightingStyle}
                    onChange={(e) =>
                      change("classOptions", {
                        ...value.classOptions,
                        fightingStyle: e.target.value,
                      })
                    }
                  >
                    {cls.fightingStyles.map((styleId) => (
                      <option key={styleId} value={styleId}>
                        {catalog.feats.find((feat) => feat.id === styleId)
                          ?.name ?? title(styleId)}
                      </option>
                    ))}
                  </select>
                </label>
                <small>
                  {
                    catalog.feats.find(
                      (feat) => feat.id === value.classOptions.fightingStyle,
                    )?.text
                  }
                </small>
              </div>
            )}
            {!!cls.initialExpertise && (
              <div className="training-choice">
                <strong>Expertise</strong>
                <p className="muted">
                  Choose {cls.initialExpertise} trained skills. Your proficiency
                  bonus is doubled for them.
                </p>
                <div className="choice-grid">
                  {[
                    ...value.skills,
                    ...bg.skills,
                    ...(value.speciesOptions.skill
                      ? [value.speciesOptions.skill]
                      : []),
                  ].map((skill) => (
                    <label className="check-choice" key={skill}>
                      <input
                        type="checkbox"
                        checked={value.classOptions.expertise.includes(skill)}
                        disabled={
                          !value.classOptions.expertise.includes(skill) &&
                          value.classOptions.expertise.length >=
                            cls.initialExpertise!
                        }
                        onChange={(e) =>
                          change("classOptions", {
                            ...value.classOptions,
                            expertise: e.target.checked
                              ? [...value.classOptions.expertise, skill]
                              : value.classOptions.expertise.filter(
                                  (entry) => entry !== skill,
                                ),
                          })
                        }
                      />
                      {skill}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {cls.casting && (
              <>
                <h3>First spells</h3>
                <p className="muted">
                  Choose spells from your class list. Review your class
                  preparation limits in the rulebook.
                </p>
                <div className="spell-choices">
                  {catalog.spells
                    .filter((s) => s.classes.includes(cls.id) && s.level <= 1)
                    .map((s) => (
                      <label className="check-choice" key={s.id}>
                        <input
                          type="checkbox"
                          checked={value.spells.includes(s.id)}
                          onChange={(e) =>
                            change(
                              "spells",
                              e.target.checked
                                ? [...value.spells, s.id]
                                : value.spells.filter((v) => v !== s.id),
                            )
                          }
                        />
                        {s.name}
                        <small>{s.level === 0 ? "Cantrip" : "1st level"}</small>
                      </label>
                    ))}
                </div>
              </>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <label>
              Before the adventure
              <textarea
                rows={5}
                value={value.narrative}
                onChange={(e) => change("narrative", e.target.value)}
                placeholder="A promise, a secret, a reason to leave home…"
                maxLength={10000}
              />
            </label>
            <div className="form-grid">
              <label>
                Arcane palette
                <select
                  value={value.appearance.palette}
                  onChange={(e) =>
                    change("appearance", {
                      ...value.appearance,
                      palette: e.target.value as "jade" | "ember" | "violet",
                    })
                  }
                >
                  <option value="jade">Moonlit jade</option>
                  <option value="ember">Autumn ember</option>
                  <option value="violet">Astral violet</option>
                </select>
              </label>
              <label>
                Miniature accessory
                <select
                  value={value.appearance.accessory}
                  onChange={(e) =>
                    change("appearance", {
                      ...value.appearance,
                      accessory: e.target.value as "staff" | "sword" | "bow",
                    })
                  }
                >
                  <option value="staff">Crystal staff</option>
                  <option value="sword">Silver sword</option>
                  <option value="bow">Longbow</option>
                </select>
              </label>
            </div>
            <p className="quiet-callout">
              {value.name || "Your character"} · Level 1 {cls.name} ·{" "}
              {value.speciesId} · {bg.name}
            </p>
            {legacy && (
              <LegacyReconciliation
                legacy={legacy}
                catalog={catalog}
                classId={value.classId}
                advancements={advancements}
                onChange={setAdvancements}
                acknowledged={acknowledged}
                onAcknowledge={setAcknowledged}
              />
            )}
          </>
        )}
      </div>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
      <footer className="modal-footer">
        <button
          className="button"
          onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
        >
          <ArrowLeft size={15} />
          {step > 0 ? "Back" : "Cancel"}
        </button>
        {step < 3 ? (
          <button className="button primary" onClick={() => setStep(step + 1)}>
            Continue
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            className="button primary"
            disabled={busy || !value.name.trim() || (!!legacy && !acknowledged)}
            onClick={finish}
          >
            {busy ? "Writing your first chapter…" : "Create character"}
            <Sparkles size={15} />
          </button>
        )}
      </footer>
    </Modal>
  );
}
