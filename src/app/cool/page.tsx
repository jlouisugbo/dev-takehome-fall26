"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_PATHS } from "@/lib/constants/paths";

type DualityOutcome = "idle" | "hope" | "fear" | "crit";
type BoardLayer = "grid" | "tokens" | "fx" | "fog";
type TokenKind = "party" | "stranded";

interface Token {
  id: string;
  name: string;
  label: string;
  kind: TokenKind;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  evasion: number;
}

interface RollResult {
  hopeDie: number;
  fearDie: number;
  modifier: number;
  total: number;
  isCrit: boolean;
  outcome: Exclude<DualityOutcome, "idle">;
  target?: number;
  success?: boolean;
}

interface FxShot {
  id: number;
  from: { col: number; row: number };
  to: { col: number; row: number };
  kind: "lunge" | "miss";
}

const COLS = 10;
const ROWS = 6;
const VISION = 3;
const WALLS = new Set(["4,2", "4,3", "5,3"]);

const STARTING_TOKENS: Token[] = [
  { id: "kael", name: "Kael", label: "Ka", kind: "party", col: 1, row: 3, hp: 7, maxHp: 7, evasion: 11 },
  { id: "nyx", name: "Nyx", label: "Ny", kind: "party", col: 2, row: 1, hp: 6, maxHp: 6, evasion: 12 },
  { id: "strand", name: "Jagged Knife", label: "Jk", kind: "stranded", col: 7, row: 2, hp: 5, maxHp: 5, evasion: 13 },
  { id: "brute", name: "Brute", label: "Br", kind: "stranded", col: 8, row: 4, hp: 8, maxHp: 8, evasion: 10 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function packCell(col: number, row: number): string {
  return `${col},${row}`;
}

function chebyshev(a: { col: number; row: number }, b: { col: number; row: number }): number {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

function manhattan(a: { col: number; row: number }, b: { col: number; row: number }): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function rangeBand(dist: number): "melee" | "close" | "far" | "very far" {
  if (dist <= 1) return "melee";
  if (dist <= 3) return "close";
  if (dist <= 5) return "far";
  return "very far";
}

function rollDuality(modifier = 0, target?: number): RollResult {
  const hopeDie = rollDie(12);
  const fearDie = rollDie(12);
  const isCrit = hopeDie === fearDie;
  const outcome: Exclude<DualityOutcome, "idle"> = isCrit ? "crit" : hopeDie > fearDie ? "hope" : "fear";
  const total = hopeDie + fearDie + modifier;
  const result: RollResult = { hopeDie, fearDie, modifier, total, isCrit, outcome };
  if (target !== undefined) {
    result.target = target;
    result.success = isCrit || total >= target;
  }
  return result;
}

function describeRoll(result: RollResult | null, rolling: boolean): string {
  if (rolling) return "Hope d12 and Fear d12 in the air…";
  if (!result) return "Same duality roller as src/engine/dice.ts — Hope vs Fear, crit on a match.";
  if (result.isCrit) return "Critical — matching dice. Clear a Stress, deal extra damage.";
  if (result.success === true) {
    return result.outcome === "hope"
      ? "Hit with Hope. The party keeps the spotlight."
      : "Hit with Fear. It lands, but the GM takes a Fear.";
  }
  if (result.success === false) {
    return result.outcome === "hope"
      ? "Miss with Hope. You still earn Hope."
      : "Miss with Fear. The scene turns.";
  }
  return result.outcome === "hope" ? "With Hope. The move belongs to the party." : "With Fear. The GM takes a Fear.";
}

function cellCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: ((col + 0.5) / COLS) * 100,
    y: ((row + 0.5) / ROWS) * 100,
  };
}

function losClear(
  from: { col: number; row: number },
  to: { col: number; row: number }
): boolean {
  const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row));
  if (steps === 0) return true;
  for (let i = 1; i < steps; i += 1) {
    const col = Math.round(from.col + ((to.col - from.col) * i) / steps);
    const row = Math.round(from.row + ((to.row - from.row) * i) / steps);
    if (WALLS.has(packCell(col, row))) return false;
  }
  return true;
}

function visibleSet(tokens: Token[]): Set<string> {
  const seen = new Set<string>();
  const origins = tokens.filter((token) => token.kind === "party" && token.hp > 0);
  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      const cell = { col, row };
      const lit = origins.some(
        (origin) => chebyshev(origin, cell) <= VISION && losClear(origin, cell)
      );
      if (lit) seen.add(packCell(col, row));
    }
  }
  return seen;
}

export default function Kewl() {
  const boardRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [tokens, setTokens] = useState<Token[]>(STARTING_TOKENS);
  const [selectedId, setSelectedId] = useState("kael");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [displayHope, setDisplayHope] = useState(1);
  const [displayFear, setDisplayFear] = useState(1);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [log, setLog] = useState<string>("Click a token, walk a cell, then Strike.");
  const [hitId, setHitId] = useState<string | null>(null);
  const [shots, setShots] = useState<FxShot[]>([]);
  const [bursts, setBursts] = useState<{ id: number; col: number; row: number }[]>([]);
  const [layers, setLayers] = useState<Record<BoardLayer, boolean>>({
    grid: true,
    tokens: true,
    fx: true,
    fog: true,
  });
  const [cameraScale, setCameraScale] = useState(1);
  const shotSeq = useRef(0);

  const selected = tokens.find((token) => token.id === selectedId) ?? tokens[0];
  const visible = useMemo(() => visibleSet(tokens), [tokens]);

  useEffect(() => {
    const ids = timers.current;
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!rolling) return undefined;
    const tick = window.setInterval(() => {
      setDisplayHope(rollDie(12));
      setDisplayFear(rollDie(12));
    }, 70);
    return () => window.clearInterval(tick);
  }, [rolling]);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  }

  function pointToCell(clientX: number, clientY: number): { col: number; row: number } | null {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      col: clamp(Math.floor(((clientX - rect.left) / rect.width) * COLS), 0, COLS - 1),
      row: clamp(Math.floor(((clientY - rect.top) / rect.height) * ROWS), 0, ROWS - 1),
    };
  }

  function moveToken(id: string, col: number, row: number) {
    if (WALLS.has(packCell(col, row))) return;
    setTokens((current) =>
      current.map((token) => {
        if (token.id !== id) return token;
        const occupied = current.some(
          (other) => other.id !== id && other.col === col && other.row === row && other.hp > 0
        );
        if (occupied) return token;
        return { ...token, col, row };
      })
    );
  }

  function nearestEnemy(id: string): Token | null {
    const me = tokens.find((token) => token.id === id);
    if (!me || me.hp <= 0) return null;
    const foes = tokens.filter((token) => token.kind !== me.kind && token.hp > 0);
    if (foes.length === 0) return null;
    return foes.reduce((best, token) =>
      manhattan(token, me) < manhattan(best, me) ? token : best
    );
  }

  function playFx(from: Token, to: Token, kind: FxShot["kind"]) {
    const id = ++shotSeq.current;
    setShots((current) => [
      ...current,
      { id, from: { col: from.col, row: from.row }, to: { col: to.col, row: to.row }, kind },
    ]);
    later(() => setShots((current) => current.filter((shot) => shot.id !== id)), 520);
    if (kind === "lunge") {
      setBursts((current) => [...current, { id, col: to.col, row: to.row }]);
      setHitId(to.id);
      later(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
        setHitId(null);
      }, 560);
    }
  }

  function settleDice(result: RollResult) {
    setLastRoll(result);
    setDisplayHope(result.hopeDie);
    setDisplayFear(result.fearDie);
    setRolling(false);
  }

  function rollCheck() {
    if (rolling) return;
    setRolling(true);
    setRollKey((key) => key + 1);
    const result = rollDuality(0);
    later(() => {
      settleDice(result);
      setLog(
        `${selected.name} rolled ${result.total} ${result.outcome === "crit" ? "crit" : `with ${result.outcome}`}.`
      );
    }, 850);
  }

  function strike() {
    if (rolling || !selected || selected.hp <= 0) return;
    const target = nearestEnemy(selected.id);
    if (!target) {
      setLog("No living enemy on the board.");
      return;
    }
    const dist = chebyshev(selected, target);
    if (dist > 3) {
      setLog(`${target.name} is ${rangeBand(dist)} — close to melee range first.`);
      return;
    }
    setRolling(true);
    setRollKey((key) => key + 1);
    const result = rollDuality(0, target.evasion);
    later(() => {
      settleDice(result);
      if (!result.success) {
        playFx(selected, target, "miss");
        setLog(
          `${selected.name} misses ${target.name} (need ${target.evasion}, rolled ${result.total} with ${result.outcome}).`
        );
        return;
      }
      const damage = result.isCrit ? result.hopeDie + result.fearDie : Math.max(1, result.hopeDie - 4);
      playFx(selected, target, "lunge");
      setTokens((current) =>
        current.map((token) =>
          token.id === target.id ? { ...token, hp: Math.max(0, token.hp - damage) } : token
        )
      );
      setLog(
        `${selected.name} hits ${target.name} for ${damage} (${result.total} vs Evasion ${target.evasion}${result.isCrit ? ", crit" : ""}).`
      );
    }, 850);
  }

  function toggleLayer(layer: BoardLayer) {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }

  const total = lastRoll && !rolling ? lastRoll.total : null;
  const outcome: DualityOutcome = !lastRoll || rolling ? "idle" : lastRoll.outcome;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Something cool
            </p>
            <h1 className="text-[28px] font-semibold leading-tight text-gray-text-dark sm:text-[36px]">
              I built a VTT for my Daggerheart campaign
            </h1>
            <p className="mt-1 max-w-xl text-sm text-gray-text">
              The Calling is a local GM console: duality dice, a Pixi battle
              board, packed-cell fog, and an FX director so tokens, hits, and
              camera stay in sync. This page is a live slice of those rules.
            </p>
          </div>
          <Link
            href="https://github.com/jlouisugbo/daggerheart-vtt"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-fit rounded-lg border border-gray-stroke bg-white px-3 py-1.5 text-sm text-gray-text hover:bg-gray-fill"
          >
            github.com/jlouisugbo/daggerheart
          </Link>
        </header>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-xl border border-gray-stroke bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Duality roller
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-6">
              <DieFace
                key={`hope-${rollKey}`}
                label="Hope"
                value={displayHope}
                rolling={rolling}
                accent="hope"
              />
              <DieFace
                key={`fear-${rollKey}`}
                label="Fear"
                value={displayFear}
                rolling={rolling}
                accent="fear"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-text">
                  Result
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-text-dark">
                  {total === null
                    ? "—"
                    : outcome === "crit"
                      ? `Crit ${total}`
                      : lastRoll?.success === true
                        ? `Hit ${total}`
                        : lastRoll?.success === false
                          ? `Miss ${total}`
                          : `${total} with ${outcome === "hope" ? "Hope" : "Fear"}`}
                </p>
                <p className="mt-1 max-w-sm text-sm text-gray-text">
                  {describeRoll(lastRoll, rolling)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={rollCheck}
                disabled={rolling}
                className="rounded-md border border-gray-stroke bg-white px-4 py-2 text-sm font-medium text-gray-text-dark hover:bg-gray-fill disabled:opacity-60"
              >
                Roll duality
              </button>
              <button
                type="button"
                onClick={strike}
                disabled={rolling}
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-white hover:text-primary disabled:opacity-60"
              >
                Strike nearest enemy
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-stroke bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Engine
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-text">
              <li>Hope d12 + Fear d12</li>
              <li>Crit on matching faces</li>
              <li>Attack vs Evasion</li>
              <li>Chebyshev range bands</li>
              <li>Shadowcast-style fog</li>
            </ul>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-stroke bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-stroke px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Graphics stack
              </p>
              <h2 className="mt-1 text-gray-text-dark">
                Drag tokens · click to walk · fog from party vision
              </h2>
            </div>
            <div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-stroke bg-gray-fill-light p-1">
              {(Object.keys(layers) as BoardLayer[]).map((layer) => (
                <button
                  key={layer}
                  type="button"
                  onClick={() => toggleLayer(layer)}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
                    layers[layer]
                      ? "bg-primary text-white shadow-sm"
                      : "text-gray-text hover:bg-white"
                  }`}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative min-h-[280px] overflow-hidden bg-primary-fill p-4">
              <div className="mx-auto flex aspect-[10/6] w-full max-w-2xl items-center justify-center overflow-hidden">
                <div
                  ref={boardRef}
                  className="relative aspect-[10/6] touch-none overflow-hidden rounded-lg border border-white bg-white shadow-sm"
                  style={{ width: `${cameraScale * 100}%` }}
                  onPointerDown={(event) => {
                    if (event.button !== 0 && event.pointerType === "mouse") return;
                    if ((event.target as HTMLElement).closest("[data-token]")) return;
                    const cell = pointToCell(event.clientX, event.clientY);
                    if (!cell || !selected || selected.hp <= 0) return;
                    moveToken(selected.id, cell.col, cell.row);
                  }}
                >
                  {layers.grid ? (
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, #eaecf0 1px, transparent 1px), linear-gradient(to bottom, #eaecf0 1px, transparent 1px)",
                        backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
                      }}
                    />
                  ) : null}

                  {Array.from(WALLS).map((key) => {
                    const [col, row] = key.split(",").map(Number);
                    return (
                      <div
                        key={key}
                        className="pointer-events-none absolute bg-gray-stroke"
                        style={{
                          left: `${(col / COLS) * 100}%`,
                          top: `${(row / ROWS) * 100}%`,
                          width: `${100 / COLS}%`,
                          height: `${100 / ROWS}%`,
                        }}
                      />
                    );
                  })}

                  {layers.fog
                    ? Array.from({ length: COLS * ROWS }, (_, i) => {
                        const col = i % COLS;
                        const row = Math.floor(i / COLS);
                        if (visible.has(packCell(col, row))) return null;
                        return (
                          <div
                            key={`fog-${col}-${row}`}
                            className="pointer-events-none absolute z-[2] bg-primary/30"
                            style={{
                              left: `${(col / COLS) * 100}%`,
                              top: `${(row / ROWS) * 100}%`,
                              width: `${100 / COLS}%`,
                              height: `${100 / ROWS}%`,
                            }}
                          />
                        );
                      })
                    : null}

                  {layers.fx ? (
                    <svg
                      className="pointer-events-none absolute inset-0 z-[4] h-full w-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {shots.map((shot) => {
                        const a = cellCenter(shot.from.col, shot.from.row);
                        const b = cellCenter(shot.to.col, shot.to.row);
                        return (
                          <line
                            key={shot.id}
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke={shot.kind === "lunge" ? "#0070ff" : "#667084"}
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            className={shot.kind === "lunge" ? "animate-fx-bolt" : "animate-fx-miss"}
                          />
                        );
                      })}
                    </svg>
                  ) : null}

                  {layers.fx
                    ? bursts.map((burst) => {
                        const pos = cellCenter(burst.col, burst.row);
                        return (
                          <span
                            key={burst.id}
                            className="pointer-events-none absolute z-[5] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary animate-fx-burst"
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                          />
                        );
                      })
                    : null}

                  {layers.tokens
                    ? tokens.map((token) => {
                        const isSelected = token.id === selectedId;
                        const hitting = token.id === hitId;
                        const hidden = layers.fog && !visible.has(packCell(token.col, token.row));
                        const pos = cellCenter(token.col, token.row);
                        const hpPct = token.maxHp === 0 ? 0 : token.hp / token.maxHp;
                        return (
                          <button
                            key={token.id}
                            type="button"
                            data-token={token.id}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(event.pointerId);
                              setSelectedId(token.id);
                              setDraggingId(token.id);
                            }}
                            onPointerMove={(event) => {
                              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                              const cell = pointToCell(event.clientX, event.clientY);
                              if (!cell) return;
                              moveToken(token.id, cell.col, cell.row);
                            }}
                            onPointerUp={(event) => {
                              event.stopPropagation();
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                              setDraggingId(null);
                            }}
                            className={`absolute z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center justify-center rounded-full border-2 text-[11px] font-semibold text-white active:cursor-grabbing ${
                              token.kind === "party"
                                ? "border-white bg-primary"
                                : "border-white bg-danger-indicator"
                            } ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""} ${
                              draggingId === token.id ? "" : "transition-[left,top] duration-150"
                            } ${hidden ? "opacity-25" : ""} ${token.hp <= 0 ? "opacity-40 grayscale" : ""}`}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            aria-label={`${token.name} token`}
                          >
                            <span
                              className={`flex h-7 w-full items-center justify-center rounded-full ${
                                hitting ? "animate-token-hit" : ""
                              }`}
                            >
                              {token.label}
                            </span>
                            <span className="absolute -bottom-1 h-1 w-7 overflow-hidden rounded-full bg-white/70">
                              <span
                                className="block h-full bg-success-indicator transition-[width] duration-300"
                                style={{ width: `${hpPct * 100}%` }}
                              />
                            </span>
                          </button>
                        );
                      })
                    : null}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-text">
                <span>
                  {selected
                    ? `${selected.name} (${selected.col}, ${selected.row}) · HP ${selected.hp}/${selected.maxHp} · Evasion ${selected.evasion}`
                    : "Select a token"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-gray-stroke bg-white px-2 py-1 hover:bg-gray-fill"
                    onClick={() => setCameraScale((s) => Math.max(0.8, Number((s - 0.1).toFixed(1))))}
                  >
                    −
                  </button>
                  <span>{Math.round(cameraScale * 100)}%</span>
                  <button
                    type="button"
                    className="rounded-md border border-gray-stroke bg-white px-2 py-1 hover:bg-gray-fill"
                    onClick={() => setCameraScale((s) => Math.min(1.3, Number((s + 0.1).toFixed(1))))}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <aside className="border-t border-gray-stroke bg-gray-fill-light p-5 text-sm text-gray-text lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Combat log
              </p>
              <p className="mt-2 min-h-[3.5rem] rounded-lg border border-gray-stroke bg-white p-3 text-[13px] leading-5 text-gray-text-dark">
                {log}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-gray-stroke bg-white p-3 text-[11px] leading-5 text-gray-text-dark">
{`rollDuality({ target: evasion })
packCell(x, y)
visibleTilesShadowcast
fxDirector.play("lunge")`}
              </pre>
              <p className="mt-3 leading-6">
                Blue tokens are the party (they punch fog). Red tokens are
                stranded. Gray cells are walls. Strike rolls Hope+Fear against
                the nearest enemy&apos;s Evasion, then plays a lunge and HP drain.
              </p>
              <Link
                href={APP_PATHS.HOME}
                className="mt-4 inline-block text-sm text-primary hover:underline"
              >
                Back home
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function DieFace({
  label,
  value,
  rolling,
  accent,
}: {
  label: string;
  value: number;
  rolling: boolean;
  accent: "hope" | "fear";
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-text">
        {label}
      </p>
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-xl border-2 bg-white text-3xl font-semibold text-gray-text-dark shadow-sm ${
          accent === "hope" ? "border-primary" : "border-gray-stroke"
        } ${rolling ? "animate-die-tumble" : ""}`}
        aria-live="polite"
      >
        {value}
      </div>
    </div>
  );
}
