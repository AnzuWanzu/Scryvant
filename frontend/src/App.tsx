import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Dices,
  Feather,
  Flame,
  Heart,
  History,
  Layers,
  LogOut,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
  X,
  Zap,
  Printer,
  RefreshCw,
  Search,
  Backpack,
  Moon,
  Sun,
  Eye,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, ApiError } from "./lib/api";
import { demo } from "./lib/demo";
import type {
  Ability,
  Advancement,
  Catalog,
  CharacterChoices,
  CharacterCommand,
  CharacterView,
  LegacyCharacter,
  Proposal,
  UserView,
} from "./lib/types";
import { Auth } from "./components/Auth";
import { Creator } from "./components/Creator";
import { Modal } from "./components/Modal";
import { LevelUp } from "./components/LevelUp";
import { ProposalPreview } from "./components/ProposalPreview";
import { PlayStatus } from "./components/PlayStatus";
import "./App.css";
const Miniature = lazy(() => import("./components/Miniature"));
const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}`;
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const abilityNames: Ability[] = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];
const tabIcons: Record<string, LucideIcon> = {
  Overview: Swords,
  Spells: Sparkles,
  Inventory: Backpack,
  Features: BookOpen,
  Journal: Feather,
};
function App() {
  const [character, setCharacter] = useState<CharacterView>(demo);
  const [user, setUser] = useState<UserView | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [list, setList] = useState<(CharacterView | LegacyCharacter)[]>([]);
  const [tab, setTab] = useState("Overview");
  const [assistant, setAssistant] = useState(true);
  const [auth, setAuth] = useState(false);
  const [creator, setCreator] = useState(false);
  const [library, setLibrary] = useState(false);
  const [settings, setSettings] = useState(false);
  const [levelUp, setLevelUp] = useState(false);
  const [history, setHistory] = useState(false);
  const [rest, setRest] = useState<"short" | "long" | null>(null);
  const [hitDice, setHitDice] = useState(0);
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [die, setDie] = useState(0);
  const [rollLabel, setRollLabel] = useState("");
  const [search, setSearch] = useState("");
  const [prompt, setPrompt] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [thinking, setThinking] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [legacyId, setLegacyId] = useState<string | null>(null);
  const preview = character.id === "preview";
  const c = character,
    d = c.derived;
  useEffect(() => {
    let alive = true;
    void fetch("/rules/catalog.json")
      .then((r) => r.json())
      .then((v) => {
        if (alive) setCatalog(v);
      })
      .catch(() => {});
    void api<{ user: UserView | null }>("/session")
      .then(async (r) => {
        if (!alive) return;
        setServerReady(true);
        setUser(r.user);
        if (r.user) {
          const v = await api<{
            characters: (CharacterView | LegacyCharacter)[];
          }>("/characters");
          if (alive) {
            setList(v.characters);
            const first = v.characters.find((v) => !("needsCompletion" in v));
            if (first) {
              const sheet = await api<CharacterView>(`/characters/${first.id}`);
              if (alive) setCharacter(sheet);
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  async function loadList() {
    const r = await api<{ characters: (CharacterView | LegacyCharacter)[] }>(
      "/characters",
    );
    setList(r.characters);
  }
  async function select(id: string) {
    try {
      setCharacter(await api<CharacterView>(`/characters/${id}`));
      setProposal(null);
      setLibrary(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function requireAccount() {
    if (!user) {
      setAuth(true);
      return false;
    }
    if (preview) {
      setCreator(true);
      return false;
    }
    return true;
  }
  async function command(cmd: CharacterCommand) {
    if (!preview && !requireAccount()) return;
    setSaving(true);
    setError("");
    setStatus("Saving…");
    try {
      if (preview) {
        const { updatePreview } = await import("./lib/preview");
        setCharacter(updatePreview(c, cmd));
        setStatus("Preview updated · not saved");
      } else {
        setCharacter(
          await api<CharacterView>(`/characters/${c.id}/commands`, "POST", {
            revision: c.revision,
            command: cmd,
          }),
        );
        setStatus("All changes saved");
      }
    } catch (e) {
      setError((e as Error).message);
      setStatus(
        e instanceof ApiError && e.status === 409
          ? "Reload required"
          : "Not saved",
      );
    } finally {
      setSaving(false);
    }
  }
  async function create(v: CharacterChoices, advancements: Advancement[] = []) {
    if (!user) {
      const { createPreview } = await import("./lib/preview");
      setCharacter(createPreview(v));
      setProposal(null);
      setStatus("Preview character · not saved");
      return;
    }
    const sheet = await api<CharacterView>(
      legacyId ? `/characters/${legacyId}/complete` : "/characters",
      "POST",
      legacyId ? { choices: v, advancements, acknowledgeChanges: true } : v,
    );
    setCharacter(sheet);
    setLegacyId(null);
    setStatus("Character saved");
    await loadList();
  }
  function roll(bonus = 0, label = "D20", sides = 20) {
    const n = new Uint32Array(1);
    const limit = Math.floor(4294967296 / sides) * sides;
    do {
      crypto.getRandomValues(n);
    } while (n[0]! >= limit);
    const value = (n[0]! % sides) + 1;
    setDie(value);
    setRollLabel(
      `${label} · ${value}${bonus ? ` ${sign(bonus)}` : ""} = ${value + bonus}`,
    );
  }
  async function ask(text = prompt) {
    if (!requireAccount()) return;
    if (!text.trim()) return;
    setThinking(true);
    setError("");
    try {
      setProposal(
        await api<Proposal>(`/characters/${c.id}/suggestions`, "POST", {
          prompt: text,
        }),
      );
      setPrompt("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setThinking(false);
    }
  }
  async function accept() {
    if (!proposal) return;
    setSaving(true);
    try {
      const result = await api<CharacterView>(
        `/characters/${c.id}/suggestions/${proposal.id}/accept`,
        "POST",
        {},
      );
      setCharacter(result);
      setProposal(null);
      setStatus("Suggestion applied");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const knownSpells =
    catalog?.spells.filter((s) => c.choices.spells.includes(s.id)) ?? [];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#character-sheet">
        Skip to character sheet
      </a>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Scryvant home">
          <span className="brand-mark">
            <Compass size={28} strokeWidth={1} />
          </span>
          <span>
            SCRYVANT<small>EVERY LEGEND BEGINS WITH YOU</small>
          </span>
        </a>
        <nav className="topnav" aria-label="Main navigation">
          <button className="active" onClick={() => setLibrary(true)}>
            <Users size={15} />
            My characters
          </button>
          <a href="/rules/SRD_CC_v5.2.1.pdf" target="_blank" rel="noreferrer">
            <BookOpen size={15} />
            The compendium
            <ArrowUpRight size={12} />
          </a>
        </nav>
        <div className="topbar-right">
          <span className="edition">5E · 2024 RULES</span>
          {user ? (
            <button
              className="account-button"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST", {});
                  setUser(null);
                  setCharacter(demo);
                  setList([]);
                  setProposal(null);
                  setStatus("Signed out");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              <span>{user.username.slice(0, 1).toUpperCase()}</span>
              <span className="account-name">{user.username}</span>
              <LogOut size={14} />
            </button>
          ) : (
            <button className="button small" onClick={() => setAuth(true)}>
              <User size={14} />
              Sign in
            </button>
          )}
        </div>
      </header>
      <aside className="rail" aria-label="Workspace tools">
        <button
          className="rail-active"
          aria-label="Character library"
          onClick={() => setLibrary(true)}
        >
          <Layers size={21} />
        </button>
        <button
          aria-label="Open character journal"
          onClick={() => setTab("Journal")}
        >
          <Feather size={20} />
        </button>
        <button aria-label="Open spells" onClick={() => setTab("Spells")}>
          <Sparkles size={20} />
        </button>
        <button aria-label="Roll a twenty-sided die" onClick={() => roll()}>
          <Dices size={20} />
        </button>
        <span />
        <button
          aria-label="Appearance settings"
          onClick={() => setSettings(true)}
        >
          <Settings2 size={20} />
        </button>
      </aside>
      <main
        id="character-sheet"
        className={`page ${assistant ? "with-assistant" : ""}`}
      >
        <div className="breadcrumb">
          <button onClick={() => setLibrary(true)}>My characters</button>
          <ChevronRight size={12} />
          <span>{c.choices.name}</span>
          <span className="breadcrumb-status">
            <span className={`status-dot ${preview ? "preview-dot" : ""}`} />
            {preview ? "TEMPORARY PREVIEW" : status || "ALL CHANGES SAVED"}
          </span>
        </div>
        <section className="character-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-diamond" />
              YOUR STORY, STILL UNFOLDING
            </div>
            <h1>
              {c.choices.name}
              <span className="name-star">✧</span>
            </h1>
            <div className="character-meta">
              <span>{title(c.choices.speciesId)}</span>
              <span className="meta-dot">·</span>
              <span>
                {title(c.choices.classId)} {c.level}
              </span>
              <span className="meta-dot">·</span>
              <span>{title(c.choices.backgroundId)}</span>
              <span className="meta-badge">
                {c.level >= 3
                  ? (catalog?.classes.find((v) => v.id === c.choices.classId)
                      ?.subclass ?? "Evoker")
                  : "A new beginning"}
              </span>
            </div>
          </div>
          <div className="heading-actions">
            <button className="button" onClick={() => window.print()}>
              <Printer size={15} />
              <span>Export sheet</span>
            </button>
            <button
              className="button gold"
              disabled={c.level >= 20}
              onClick={() => setLevelUp(true)}
            >
              <Plus size={15} />
              Level up
            </button>
            <button
              className={`icon-button ${assistant ? "selected" : ""}`}
              aria-label={assistant ? "Hide AI assistant" : "Show AI assistant"}
              onClick={() => setAssistant(!assistant)}
            >
              <Sparkles size={19} />
            </button>
          </div>
        </section>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            {!preview && (
              <button onClick={() => void select(c.id)}>
                <RefreshCw size={14} />
                Reload sheet
              </button>
            )}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="workspace">
          <section className="portrait-column">
            <div className="portrait-card">
              <div className="portrait-top">
                <span className="eyebrow">THE ADVENTURER</span>
                <button
                  className="icon-button"
                  aria-label="Customize miniature"
                  onClick={() => setSettings(true)}
                >
                  <Settings2 size={16} />
                </button>
              </div>
              <div className="portrait-orbit orbit-one" />
              <div className="portrait-orbit orbit-two" />
              <div className="constellation-label">AD ASTRA, PER ARCANA</div>
              <Suspense
                fallback={
                  <div className="miniature-loading">
                    <Compass size={50} strokeWidth={0.6} />
                    <span>Summoning your miniature…</span>
                  </div>
                }
              >
                <Miniature
                  palette={c.choices.appearance.palette}
                  accessory={c.choices.appearance.accessory}
                  classId={c.choices.classId}
                  die={die}
                />
              </Suspense>
              <div className="portrait-bottom">
                <span className="level-seal">
                  <small>LEVEL</small>
                  <strong>{String(c.level).padStart(2, "0")}</strong>
                </span>
                <div>
                  <strong>{title(c.choices.classId)}</strong>
                  <span>
                    {c.level >= 3
                      ? (catalog?.classes.find(
                          (v) => v.id === c.choices.classId,
                        )?.subclass ?? "Evoker")
                      : "The first chapter"}
                  </span>
                </div>
                <button
                  aria-label="Customize appearance"
                  onClick={() => setSettings(true)}
                >
                  <Feather size={16} />
                </button>
              </div>
            </div>
            <div className="inspiration-card">
              <span className="inspiration-icon">
                <Sparkles size={17} />
              </span>
              <div>
                <h3>A little inspiration</h3>
                <p>Every roll is a new possibility.</p>
              </div>
              <button
                className="icon-button"
                aria-label="Roll an inspiration die"
                onClick={() => roll(0, "Inspiration")}
              >
                <Dices size={19} />
              </button>
            </div>
            <div className="story-card">
              <div className="section-title">
                <span className="eyebrow">BEHIND THE LEGEND</span>
                <Feather size={14} />
              </div>
              <p>
                {c.choices.narrative ||
                  "Every adventurer has a story. Yours is waiting to be written."}
              </p>
              <button className="text-button" onClick={() => setTab("Journal")}>
                Read your story
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
          <div className="sheet-column">
            <section className="ability-grid" aria-label="Ability scores">
              {abilityNames.map((a) => (
                <button
                  className={`ability-card ${a === d.spellAbility ? "highlight" : ""}`}
                  key={a}
                  onClick={() => roll(d.modifiers[a], `${title(a)} check`)}
                  aria-label={`Roll ${a} check, modifier ${sign(d.modifiers[a])}`}
                >
                  <span>{a.slice(0, 3).toUpperCase()}</span>
                  <strong>{sign(d.modifiers[a])}</strong>
                  <small>{d.scores[a]}</small>
                </button>
              ))}
            </section>
            <section className="vitals-card">
              <div className="hp-block">
                <div className="section-title">
                  <h2>
                    <Heart size={16} />
                    Hit points
                  </h2>
                  <span className="pill">
                    {c.state.hp === 0
                      ? "UNCONSCIOUS"
                      : c.state.hp === d.maxHp
                        ? "HEALTHY"
                        : "WOUNDED"}
                  </span>
                </div>
                <div className="hp-value">
                  <strong>{c.state.hp}</strong>
                  <span>/ {d.maxHp}</span>
                  <small>MAX HP</small>
                </div>
                <div className="hp-track">
                  <span style={{ width: `${(c.state.hp / d.maxHp) * 100}%` }} />
                </div>
                <div className="hp-controls">
                  <input
                    aria-label="Damage or healing amount"
                    type="number"
                    value={amount}
                    min={1}
                    max={1000}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  <button
                    disabled={saving}
                    onClick={() => void command({ type: "damage", amount })}
                  >
                    <Minus size={12} />
                    Damage
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => void command({ type: "heal", amount })}
                  >
                    <Plus size={12} />
                    Heal
                  </button>
                  <button
                    title="Grant temporary hit points"
                    disabled={saving}
                    onClick={() => void command({ type: "temp-hp", amount })}
                  >
                    + Temp
                  </button>
                </div>
                <span className="temp-hp">
                  Temporary HP <b>{c.state.tempHp}</b>
                </span>
              </div>
              <div className="combat-stats">
                <div>
                  <Shield size={24} strokeWidth={1.2} />
                  <strong>{d.armorClass}</strong>
                  <span>ARMOR CLASS</span>
                </div>
                <button onClick={() => roll(d.initiative, "Initiative")}>
                  <Zap size={22} strokeWidth={1.2} />
                  <strong>{sign(d.initiative)}</strong>
                  <span>INITIATIVE</span>
                </button>
                <div>
                  <Compass size={23} strokeWidth={1.2} />
                  <strong>
                    {d.speed}
                    <small>ft</small>
                  </strong>
                  <span>SPEED</span>
                </div>
              </div>
            </section>
            <div className="sheet-quickbar">
              <span>
                <span className="small-rune">✧</span>Proficiency{" "}
                <b>{sign(d.proficiency)}</b>
              </span>
              <span>
                <Eye size={14} />
                Passive perception <b>{10 + (d.skills.Perception ?? 0)}</b>
              </span>
              <button onClick={() => setRest("short")}>
                <Sun size={14} />
                Short rest
              </button>
              <button onClick={() => setRest("long")}>
                <Moon size={14} />
                Long rest
              </button>
            </div>
            <nav className="sheet-tabs" aria-label="Sheet sections">
              {Object.entries(tabIcons).map(([label, Icon]) => (
                <button
                  key={label}
                  className={tab === label ? "active" : ""}
                  onClick={() => {
                    setTab(label);
                    setSearch("");
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </nav>
            <section className="tab-content">
              {tab === "Overview" && (
                <>
                  <div className="section-title">
                    <h2>Ready for anything</h2>
                    <span className="eyebrow">ACTIONS & ABILITIES</span>
                  </div>
                  <div className="attack-list">
                    {d.attacks.length ? (
                      d.attacks.map((a) => (
                        <button
                          className="attack-row"
                          key={a.name}
                          onClick={() => roll(a.bonus, `${a.name} attack`)}
                        >
                          <span className="attack-symbol">
                            <Swords size={20} />
                          </span>
                          <span>
                            <strong>{a.name}</strong>
                            <small>Weapon attack</small>
                          </span>
                          <b>{sign(a.bonus)}</b>
                          <span className="damage-die">{a.damage}</span>
                          <Dices size={16} />
                        </button>
                      ))
                    ) : (
                      <p className="empty-inline">
                        Equip a weapon from your inventory to add an attack.
                      </p>
                    )}
                    {d.spellAbility && (
                      <button
                        className="attack-row"
                        onClick={() => roll(d.spellAttack, "Spell attack")}
                      >
                        <span className="attack-symbol magic">
                          <Flame size={20} />
                        </span>
                        <span>
                          <strong>Spell attack</strong>
                          <small>
                            {title(d.spellAbility)} · Save DC {d.spellDc}
                          </small>
                        </span>
                        <b>{sign(d.spellAttack)}</b>
                        <span className="damage-die">Spellcasting</span>
                        <Dices size={16} />
                      </button>
                    )}
                  </div>
                  <div className="skills-layout">
                    <div>
                      <div className="section-title">
                        <h3>Saving throws</h3>
                        <Shield size={14} />
                      </div>
                      {abilityNames.map((a) => (
                        <button
                          className="skill-row"
                          key={a}
                          onClick={() => roll(d.saves[a], `${title(a)} save`)}
                        >
                          <span
                            className={`proficiency-dot ${d.saves[a] !== d.modifiers[a] ? "filled" : ""}`}
                          />
                          <span>{title(a)}</span>
                          <b>{sign(d.saves[a])}</b>
                        </button>
                      ))}
                      <div className="resource-box">
                        <h3>Class resources</h3>
                        {d.resources.map((r) => (
                          <div className="resource" key={r.id}>
                            <span>
                              {r.name}
                              <small>
                                {r.rest === "short"
                                  ? "Short rest recovery"
                                  : "Long rest recovery"}
                              </small>
                            </span>
                            <button
                              disabled={saving}
                              onClick={() =>
                                void command({ type: "resource", id: r.id })
                              }
                              aria-label={`Use ${r.name}`}
                            >
                              {Math.max(
                                0,
                                r.max - (c.state.resourcesUsed[r.id] ?? 0),
                              )}
                              <small> / {r.max}</small>
                              <Minus size={12} />
                            </button>
                          </div>
                        ))}
                        {!d.resources.length && (
                          <small className="muted">
                            Your class resources appear as you level up.
                          </small>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="section-title">
                        <h3>Skills</h3>
                        <span className="eyebrow">CLICK TO ROLL</span>
                      </div>
                      {Object.entries(d.skills).map(([s, v]) => (
                        <button
                          className="skill-row"
                          key={s}
                          onClick={() => roll(v, s)}
                        >
                          <span
                            className={`proficiency-dot ${c.choices.skills.includes(s) || catalog?.backgrounds.find((b) => b.id === c.choices.backgroundId)?.skills.includes(s) ? "filled" : ""}`}
                          />
                          <span>{s}</span>
                          <b>{sign(v)}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {tab === "Spells" && (
                <>
                  <div className="section-title">
                    <h2>Your spellbook</h2>
                    <span className="pill">SAVE DC {d.spellDc}</span>
                  </div>
                  <p className="muted">
                    Up to {d.spellLimits.cantrips} class cantrips and{" "}
                    {d.spellLimits.prepared} prepared spells.
                  </p>
                  <div className="slot-grid">
                    {d.slots.map(
                      (max, i) =>
                        max > 0 && (
                          <div key={i}>
                            <span>LEVEL {i + 1}</span>
                            <div>
                              {Array.from({ length: max }, (_, j) => (
                                <i
                                  key={j}
                                  className={
                                    j < max - (c.state.slotsUsed[i] ?? 0)
                                      ? "available"
                                      : ""
                                  }
                                />
                              ))}
                            </div>
                            <small>
                              {max - (c.state.slotsUsed[i] ?? 0)} / {max} slots
                            </small>
                          </div>
                        ),
                    )}
                  </div>
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      placeholder="Find a spell…"
                      aria-label="Search spells"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  {knownSpells
                    .filter((s) =>
                      s.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((s) => (
                      <details className="spell-entry" key={s.id}>
                        <summary>
                          <span className="spell-level">{s.level || "✧"}</span>
                          <span>
                            <strong>{s.name}</strong>
                            <small>
                              {s.level ? `Level ${s.level}` : "Cantrip"}
                              {s.concentration ? " · Concentration" : ""}
                              {s.ritual ? " · Ritual" : ""}
                            </small>
                          </span>
                          <ChevronDown size={15} />
                        </summary>
                        <p>{s.text}</p>
                        <div className="spell-actions">
                          <a
                            href={`/rules/SRD_CC_v5.2.1.pdf#page=${s.page}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            SRD p. {s.page}
                            <ArrowUpRight size={12} />
                          </a>
                          <button
                            className="button small"
                            onClick={() =>
                              void command({
                                type: "cast",
                                spellId: s.id,
                                slot:
                                  s.level === 0
                                    ? 0
                                    : d.slots.findIndex(
                                        (max, i) =>
                                          i + 1 >= s.level &&
                                          max > (c.state.slotsUsed[i] ?? 0),
                                      ) + 1,
                              })
                            }
                          >
                            Cast spell
                            <Sparkles size={13} />
                          </button>
                        </div>
                      </details>
                    ))}
                  {knownSpells.length === 0 && (
                    <p className="empty-inline">
                      No spells selected. Add spells from the compendium below.
                    </p>
                  )}
                  {catalog && (
                    <details className="manage-spells">
                      <summary>
                        Manage prepared spells
                        <Plus size={15} />
                      </summary>
                      <div className="spell-choices">
                        {catalog.spells
                          .filter(
                            (s) =>
                              s.classes.includes(c.choices.classId) &&
                              s.level <=
                                d.slots.findLastIndex((n) => n > 0) + 1,
                          )
                          .map((s) => (
                            <label className="check-choice" key={s.id}>
                              <input
                                type="checkbox"
                                checked={c.choices.spells.includes(s.id)}
                                disabled={saving}
                                onChange={(e) =>
                                  void command({
                                    type: "spells",
                                    spells: e.target.checked
                                      ? [...c.choices.spells, s.id]
                                      : c.choices.spells.filter(
                                          (id) => id !== s.id,
                                        ),
                                  })
                                }
                              />
                              {s.name}
                              <small>{s.level || "Cantrip"}</small>
                            </label>
                          ))}
                      </div>
                    </details>
                  )}
                </>
              )}
              {tab === "Inventory" && (
                <>
                  <div className="section-title">
                    <h2>Tools of the journey</h2>
                    <span className="pill gold-text">{c.state.gold} GP</span>
                  </div>
                  {c.state.inventory.map((i) => (
                    <div className="inventory-row" key={i.id}>
                      <Backpack size={19} />
                      <span>
                        <strong>
                          {catalog?.equipment.find((e) => e.id === i.id)
                            ?.name ?? title(i.id.replaceAll("-", " "))}
                        </strong>
                        <small>Quantity {i.quantity}</small>
                      </span>
                      <button
                        className={`button small ${i.equipped ? "selected" : ""}`}
                        disabled={saving}
                        onClick={() =>
                          void command({
                            type: "inventory",
                            items: c.state.inventory.map((v) =>
                              v.id === i.id
                                ? { ...v, equipped: !v.equipped }
                                : v,
                            ),
                            gold: c.state.gold,
                          })
                        }
                      >
                        {i.equipped ? (
                          <>
                            <Check size={13} />
                            Equipped
                          </>
                        ) : (
                          "Equip"
                        )}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove ${i.id}`}
                        onClick={() =>
                          void command({
                            type: "inventory",
                            items: c.state.inventory.filter(
                              (v) => v.id !== i.id,
                            ),
                            gold: c.state.gold,
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <label className="add-equipment">
                    Add equipment
                    <select
                      aria-label="Add equipment"
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          void command({
                            type: "inventory",
                            items: [
                              ...c.state.inventory,
                              {
                                id: e.target.value,
                                quantity: 1,
                                equipped: false,
                              },
                            ],
                            gold: c.state.gold,
                          });
                      }}
                    >
                      <option value="">Choose from the compendium…</option>
                      {catalog?.equipment
                        .filter(
                          (e) => !c.state.inventory.some((i) => i.id === e.id),
                        )
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </>
              )}
              {tab === "Features" && (
                <>
                  <div className="section-title">
                    <h2>The makings of a legend</h2>
                    <span className="eyebrow">LEVEL {c.level}</span>
                  </div>
                  {d.features.map((f, i) => (
                    <details className="feature-entry" key={`${f.name}-${i}`}>
                      <summary>
                        <span className="feature-icon">
                          <BookOpen size={18} />
                        </span>
                        <span>
                          <strong>{f.name}</strong>
                          <small>Level {f.level} feature</small>
                        </span>
                        <ChevronDown size={15} />
                      </summary>
                      <p>{f.text}</p>
                      <a
                        href={`/rules/SRD_CC_v5.2.1.pdf#page=${f.page}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Read the source · SRD p. {f.page}
                        <ArrowUpRight size={12} />
                      </a>
                    </details>
                  ))}
                </>
              )}
              {tab === "Journal" && (
                <Journal
                  key={`${c.id}-${c.revision}`}
                  narrative={c.choices.narrative}
                  notes={c.state.notes}
                  onSave={command}
                  onHistory={() => setHistory(true)}
                />
              )}
            </section>
            <PlayStatus character={c} busy={saving} onCommand={command} />
            <section className="conditions-bar">
              <span>
                <Shield size={14} />
                Conditions
              </span>
              {c.state.conditions.length ? (
                c.state.conditions.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      void command({
                        type: "conditions",
                        conditions: c.state.conditions.filter((v) => v !== s),
                        exhaustion: c.state.exhaustion,
                      })
                    }
                  >
                    {s}
                    <X size={10} />
                  </button>
                ))
              ) : (
                <small>No active conditions</small>
              )}
              <select
                aria-label="Add a condition"
                value=""
                onChange={(e) => {
                  if (e.target.value)
                    void command({
                      type: "conditions",
                      conditions: [...c.state.conditions, e.target.value],
                      exhaustion: c.state.exhaustion,
                    });
                }}
              >
                <option value="">+ Add</option>
                {catalog?.conditions
                  .filter((v) => !c.state.conditions.includes(v))
                  .map((v) => (
                    <option key={v}>{v}</option>
                  ))}
              </select>
            </section>
          </div>
          {assistant && (
            <aside className="assistant-panel">
              <header>
                <span className="assistant-emblem">
                  <Sparkles size={19} />
                </span>
                <div>
                  <h2>Your arcane companion</h2>
                  <span>
                    <i /> AI-ASSISTED · HUMAN-GUIDED
                  </span>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close assistant"
                  onClick={() => setAssistant(false)}
                >
                  <X size={15} />
                </button>
              </header>
              <div className="assistant-content">
                <span className="assistant-big-star">✧</span>
                <h3>
                  A little wisdom.
                  <br />A world of possibility.
                </h3>
                <p>
                  Your story is yours to tell. I’m here to help you discover
                  what comes next.
                </p>
                <span className="eyebrow assistant-label">
                  WHERE SHALL WE BEGIN?
                </span>
                {[
                  {
                    icon: Feather,
                    text: "Help me write my backstory",
                    prompt: "Suggest an evocative backstory for my character.",
                  },
                  {
                    icon: BookOpen,
                    text: "Explain a rule or ability",
                    prompt:
                      "Explain my class’s core abilities using the supplied rules.",
                  },
                  {
                    icon: Compass,
                    text: "Explore my spell choices",
                    prompt:
                      "Explain what to consider when choosing spells for my character.",
                  },
                ].map(({ icon: Icon, text, prompt }) => (
                  <button
                    className="prompt-card"
                    key={text}
                    onClick={() => void ask(prompt)}
                  >
                    <Icon size={16} />
                    <span>{text}</span>
                    <ChevronRight size={13} />
                  </button>
                ))}
                {proposal && (
                  <div className="proposal">
                    <span className="eyebrow">
                      A SUGGESTION, NOT A DECISION
                    </span>
                    <p>{proposal.explanation}</p>
                    {proposal.command && (
                      <>
                        <ProposalPreview command={proposal.command} />
                        <button
                          className="button primary small"
                          disabled={saving}
                          onClick={() => void accept()}
                        >
                          Accept change
                          <Check size={14} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setProposal(null)}
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    {proposal.sources.map((s) => (
                      <a
                        key={s.page}
                        href={`/rules/SRD_CC_v5.2.1.pdf#page=${s.page}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.label} · p. {s.page}
                      </a>
                    ))}
                  </div>
                )}
                {thinking && (
                  <p role="status" className="thinking">
                    Consulting the archives…
                  </p>
                )}
                <div className="assistant-rule">
                  <Shield size={15} />
                  <span>
                    You approve every change.
                    <br />
                    Your character stays in your hands.
                  </span>
                </div>
              </div>
              <form
                className="assistant-compose"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask();
                }}
              >
                <textarea
                  aria-label="Ask the AI assistant"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask, imagine, explore…"
                  maxLength={2000}
                  rows={2}
                />
                <div>
                  <span>GEMINI · SRD 5.2.1</span>
                  <button
                    type="submit"
                    disabled={thinking || !prompt.trim()}
                    aria-label="Send message"
                  >
                    <ArrowUp size={17} />
                  </button>
                </div>
              </form>
              <small className="ai-footnote">
                AI can make mistakes. Check the source rules.
              </small>
            </aside>
          )}
        </div>
        <footer className="page-footer">
          <span>
            <Compass size={14} />
            Made for the stories you haven’t told yet.
          </span>
          <a href="/rules/SRD_CC_v5.2.1.pdf" target="_blank" rel="noreferrer">
            SRD 5.2.1 · CC BY 4.0
            <ArrowUpRight size={12} />
          </a>
        </footer>
        {preview && (
          <div className="preview-banner">
            <span>
              <Eye size={15} />
              <b>Interactive preview · changes are temporary.</b>
              <span>
                Try the sheet, then sign in to save your own character.
              </span>
            </span>
            <button onClick={() => setCreator(true)}>
              Create your character
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </main>
      <button
        aria-label="Roll dice"
        className="floating-dice"
        onClick={() => roll()}
      >
        <Dices size={20} />
        <span>Roll dice</span>
      </button>
      {rollLabel && (
        <div className="roll-toast" role="status">
          <Dices size={18} />
          <span>{rollLabel}</span>
          <button onClick={() => setRollLabel("")} aria-label="Dismiss roll">
            <X size={13} />
          </button>
        </div>
      )}
      {auth && (
        <Auth
          onClose={() => setAuth(false)}
          onLogin={(u) => {
            setUser(u);
            setServerReady(true);
            void loadList().then(() => setLibrary(true));
          }}
        />
      )}
      {creator && catalog && (
        <Creator
          legacy={
            list.find((v) => v.id === legacyId && "needsCompletion" in v) as
              LegacyCharacter | undefined
          }
          catalog={catalog}
          onClose={() => {
            setCreator(false);
            setLegacyId(null);
          }}
          onCreate={create}
        />
      )}
      {library && (
        <Modal
          title="Your company of adventurers."
          onClose={() => setLibrary(false)}
          wide
        >
          <div className="library-toolbar">
            <p className="muted">A shelf of stories. A thousand roads ahead.</p>
            <button
              className="button primary"
              onClick={() => {
                setLibrary(false);
                setCreator(true);
              }}
            >
              <Plus size={15} />
              New character
            </button>
          </div>
          {!user && (
            <p className="quiet-callout">
              Sign in to keep your characters. You can explore Vaelis’s example
              sheet in the meantime.
            </p>
          )}
          <div className="character-library">
            {list.map((v) => (
              <button
                className="library-card"
                key={v.id}
                onClick={() => {
                  if ("needsCompletion" in v) {
                    setLegacyId(v.id);
                    setLibrary(false);
                    setCreator(true);
                  } else void select(v.id);
                }}
              >
                <span className="library-rune">✧</span>
                <strong>
                  {"needsCompletion" in v ? v.name : v.choices.name}
                </strong>
                <small>
                  {"needsCompletion" in v
                    ? "Legacy sheet · finish setup"
                    : `Level ${v.level} ${title(v.choices.classId)} · ${title(v.choices.speciesId)}`}
                </small>
                <ArrowUpRight size={16} />
              </button>
            ))}
            <button
              className="library-card example"
              onClick={() => {
                setCharacter(demo);
                setLibrary(false);
              }}
            >
              <span className="library-rune">✧</span>
              <strong>Vaelis Moonweaver</strong>
              <small>Example character · explore the observatory</small>
              <ArrowUpRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {settings && (
        <Modal
          title="A reflection of your character."
          onClose={() => setSettings(false)}
        >
          <p className="muted">
            Choose a miniature palette and accessory. These change your
            portrait, not your equipment.
          </p>
          <label>
            Palette
            <select
              aria-label="Palette"
              value={c.choices.appearance.palette}
              onChange={(e) => {
                const appearance = {
                  ...c.choices.appearance,
                  palette: e.target.value as "jade" | "ember" | "violet",
                };
                if (preview)
                  setCharacter({ ...c, choices: { ...c.choices, appearance } });
                else void command({ type: "appearance", appearance });
              }}
            >
              <option value="jade">Moonlit jade</option>
              <option value="ember">Autumn ember</option>
              <option value="violet">Astral violet</option>
            </select>
          </label>
          <label>
            Accessory
            <select
              aria-label="Accessory"
              value={c.choices.appearance.accessory}
              onChange={(e) => {
                const appearance = {
                  ...c.choices.appearance,
                  accessory: e.target.value as "staff" | "sword" | "bow",
                };
                if (preview)
                  setCharacter({ ...c, choices: { ...c.choices, appearance } });
                else void command({ type: "appearance", appearance });
              }}
            >
              <option value="staff">Crystal staff</option>
              <option value="sword">Silver sword</option>
              <option value="bow">Longbow</option>
            </select>
          </label>
        </Modal>
      )}
      {rest && (
        <Modal
          title={
            rest === "short"
              ? "A moment to catch your breath."
              : "Rest beneath the stars."
          }
          onClose={() => setRest(null)}
        >
          <p className="muted">
            {rest === "short"
              ? "Spend Hit Dice to recover HP. Eligible class resources recover automatically."
              : "After a completed Long Rest, recover HP, Hit Dice, spell slots, and eligible resources. Exhaustion decreases by one."}
          </p>
          {rest === "short" && (
            <label>
              Hit Dice to spend ({c.level - c.state.hitDiceUsed} available)
              <input
                type="number"
                min={0}
                max={c.level - c.state.hitDiceUsed}
                value={hitDice}
                onChange={(e) => setHitDice(Number(e.target.value))}
              />
            </label>
          )}
          <button
            className="button primary"
            onClick={() => {
              void command({
                type: "rest",
                kind: rest,
                hitDice: rest === "short" ? hitDice : 0,
              });
              setRest(null);
            }}
          >
            Complete {rest} rest
            <Moon size={16} />
          </button>
        </Modal>
      )}
      {levelUp && (
        <LevelUp
          feats={catalog?.feats ?? []}
          character={c}
          onClose={() => setLevelUp(false)}
          onCommand={command}
          die={
            catalog?.classes.find((v) => v.id === c.choices.classId)?.die ?? 6
          }
        />
      )}
      {history && (
        <Modal title="The chapters so far." onClose={() => setHistory(false)}>
          {c.history.length ? (
            c.history.map((h) => (
              <div className="history-row" key={h.revision}>
                <History size={16} />
                <span>
                  {title(h.summary.replaceAll("-", " "))}
                  <small>{new Date(h.at).toLocaleString()}</small>
                </span>
                <span>#{h.revision}</span>
              </div>
            ))
          ) : (
            <p className="muted">Your first saved change will appear here.</p>
          )}
        </Modal>
      )}
      {!serverReady && auth && (
        <span className="sr-only" role="status">
          Account services require a running backend.
        </span>
      )}
    </div>
  );
}
function Journal({
  narrative,
  notes,
  onSave,
  onHistory,
}: {
  narrative: string;
  notes: string;
  onSave: (c: CharacterCommand) => Promise<void>;
  onHistory: () => void;
}) {
  const [story, setStory] = useState(narrative);
  const [journal, setJournal] = useState(notes);
  return (
    <div className="journal">
      <div className="section-title">
        <h2>A life between the lines</h2>
        <button className="text-button" onClick={onHistory}>
          <History size={14} />
          History
        </button>
      </div>
      <label>
        Backstory
        <textarea
          rows={6}
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={10000}
        />
      </label>
      <button
        className="button small"
        onClick={() => void onSave({ type: "narrative", narrative: story })}
      >
        Save story
        <Check size={14} />
      </button>
      <label>
        Adventure notes
        <textarea
          rows={5}
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          maxLength={20000}
        />
      </label>
      <button
        className="button small"
        onClick={() => void onSave({ type: "notes", notes: journal })}
      >
        Save notes
        <Check size={14} />
      </button>
    </div>
  );
}
export default App;
