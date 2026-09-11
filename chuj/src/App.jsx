import { useState, useEffect, useMemo } from "react";
import "./App.css";

const PALETTE = {
  bg: "#241a12",
  bgSoft: "#3a2a1c",
  card: "#f6eee1",
  cardAlt: "#efe3cf",
  ink: "#2a1d13",
  inkSoft: "#6b5a47",
  red: "#a3382b",
  redSoft: "#e9d3ce",
  gold: "#9c7327",
  goldSoft: "#ecdfb9",
  green: "#3d6b45",
  greenSoft: "#d9e6d4",
  accent: "#cf9b3e",
  line: "#d8c8ab",
  danger: "#a3382b",
  warn: "#b3862f",
};

const STORAGE_KEY = "sedma-game-state";

const FONT_BODY = "'Inter', Arial, sans-serif";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";

function HeartIcon({ color = PALETTE.red, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 21s-7.5-4.6-10-9.3C0.3 8.1 2 4.5 5.6 4c2.1-.3 4 .8 6.4 3.4C14.4 4.8 16.3 3.7 18.4 4c3.6.5 5.3 4.1 3.6 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
function AcornIcon({ color = PALETTE.gold, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 9c0-3 2.2-5.5 5-5.5S17 6 17 9c0 4-2.5 10-5 12-2.5-2-5-8-5-12z" fill={color} />
      <path d="M6 8c0-2.8 2.7-5 6-5s6 2.2 6 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.55" />
    </svg>
  );
}
function LeafIcon({ color = PALETTE.green, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20 4C10 4 4 10 4 18c0 1 .1 1.8.2 2 6-1 12-4.5 14.6-11C19.6 6.6 20 5.2 20 4z" />
      <path d="M5 19c4-7 9-11 14-13" stroke={PALETTE.card} strokeWidth="0.8" fill="none" opacity="0.5" />
    </svg>
  );
}

function defaultState() {
  return { phase: "setup", players: ["", "", "", ""], rounds: [] };
}

function computeRound({ redCounts, acornOut, leafOut, acornTaker, leafTaker, bodka }) {
  const redMult = acornOut && leafOut ? 2 : 1;
  const acornMult = acornOut ? 2 : 1;
  const leafMult = leafOut ? 2 : 1;
  const totalRoundPoints = 8 * redMult + 4 * acornMult + 8 * leafMult;

  const base = redCounts.map(
    (c, i) =>
      c * redMult +
      (acornTaker === i ? 4 * acornMult : 0) +
      (leafTaker === i ? 8 * leafMult : 0)
  );

  const sweepIdx = redCounts.findIndex(
    (c, i) => c === 8 && acornTaker === i && leafTaker === i
  );

  let deltas;
  if (sweepIdx !== -1) {
    deltas = base.map((_, i) => (i === sweepIdx ? 0 : totalRoundPoints));
  } else {
    deltas = base.map((b, i) => {
      if (bodka[i]) return b === 0 ? -10 : b * 2;
      return b;
    });
  }
  return { deltas, sweepIdx, totalRoundPoints, redMult, acornMult, leafMult };
}

function Toggle({ checked, onChange, label, icon }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="sedma-chip"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 500,
        fontFamily: FONT_BODY,
        background: checked ? PALETTE.accent : PALETTE.cardAlt,
        color: checked ? PALETTE.ink : PALETTE.inkSoft,
        border: `1.5px solid ${checked ? PALETTE.accent : PALETTE.line}`,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function PlayerChip({ active, onClick, name, color }) {
  return (
    <button
      onClick={onClick}
      className="sedma-chip"
      style={{
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 14,
        fontWeight: 600,
        fontFamily: FONT_BODY,
        background: active ? color : PALETTE.card,
        color: active ? "#fff" : PALETTE.ink,
        border: `2px solid ${active ? color : PALETTE.line}`,
        cursor: "pointer",
      }}
    >
      {name}
    </button>
  );
}

function Stepper({ value, onChange, max = 8 }) {
  const btnStyle = {
    width: 32,
    height: 32,
    borderRadius: 999,
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: PALETTE.cardAlt,
    color: PALETTE.ink,
    border: `1.5px solid ${PALETTE.line}`,
    cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} style={btnStyle}>
        –
      </button>
      <div
        style={{
          width: 28,
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontWeight: 700,
          fontSize: 18,
          color: PALETTE.ink,
        }}
      >
        {value}
      </div>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={btnStyle}>
        +
      </button>
    </div>
  );
}

export default function SedmaScoreboard() {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState(["", "", "", ""]);
  const [rounds, setRounds] = useState([]);

  const [redCounts, setRedCounts] = useState([0, 0, 0, 0]);
  const [acornOut, setAcornOut] = useState(false);
  const [leafOut, setLeafOut] = useState(false);
  const [acornTaker, setAcornTaker] = useState(null);
  const [leafTaker, setLeafTaker] = useState(null);
  const [bodka, setBodka] = useState([false, false, false, false]);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setPhase(parsed.phase || "setup");
          setPlayers(parsed.players || ["", "", "", ""]);
          setRounds(parsed.rounds || []);
        }
      } catch (e) {
        // no saved state yet
      }
      setLoaded(true);
    })();
  }, []);

  async function persist(next) {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
    } catch (e) {
      console.error("Uloženie zlyhalo", e);
    }
  }

  const totals = useMemo(() => {
    const t = [0, 0, 0, 0];
    rounds.forEach((r) => r.deltas.forEach((d, i) => (t[i] += d)));
    return t;
  }, [rounds]);

  function startGame() {
    const finalPlayers = players.map((p, i) => (p.trim() ? p.trim() : `Hráč ${i + 1}`));
    const next = { phase: "playing", players: finalPlayers, rounds: [] };
    setPlayers(finalPlayers);
    setPhase("playing");
    setRounds([]);
    persist(next);
  }

  const redSum = redCounts.reduce((a, b) => a + b, 0);
  const canSubmit = redSum === 8 && acornTaker !== null && leafTaker !== null;

  function submitRound() {
    if (!canSubmit) return;
    const result = computeRound({ redCounts, acornOut, leafOut, acornTaker, leafTaker, bodka });
    const record = {
      redCounts, acornOut, leafOut, acornTaker, leafTaker, bodka,
      deltas: result.deltas, sweepIdx: result.sweepIdx, totalRoundPoints: result.totalRoundPoints,
    };
    const newRounds = [...rounds, record];
    const newTotals = [0, 0, 0, 0];
    newRounds.forEach((r) => r.deltas.forEach((d, i) => (newTotals[i] += d)));

    // Presne 100 bodov => -20 trest
    newTotals.forEach((t, i) => {
      if (t === 100) {
        newTotals[i] -= 20;
        record.deltas[i] -= 20;
      }
    });

    const finished = newTotals.some((t) => t >= 101);
    const next = { phase: finished ? "finished" : "playing", players, rounds: newRounds };
    setRounds(newRounds);
    setPhase(finished ? "finished" : "playing");
    persist(next);

    setRedCounts([0, 0, 0, 0]);
    setAcornOut(false);
    setLeafOut(false);
    setAcornTaker(null);
    setLeafTaker(null);
    setBodka([false, false, false, false]);
  }

  function undoLast() {
    if (rounds.length === 0) return;
    const newRounds = rounds.slice(0, -1);
    const next = { phase: "playing", players, rounds: newRounds };
    setRounds(newRounds);
    setPhase("playing");
    persist(next);
  }

  function nextGameSamePlayers() {
    const next = { phase: "playing", players, rounds: [] };
    setRounds([]);
    setPhase("playing");
    persist(next);
  }

  function newPlayers() {
    const next = defaultState();
    setPlayers(next.players);
    setRounds([]);
    setPhase("setup");
    persist(next);
  }

  if (!loaded) {
    return (
      <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: PALETTE.bg, color: PALETTE.card, fontFamily: FONT_BODY }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18 }}>Načítavam hru…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 600, width: "100%", background: PALETTE.bg, fontFamily: FONT_BODY, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 448, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, justifyContent: "center" }}>
          <HeartIcon /> <AcornIcon /> <LeafIcon />
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, marginLeft: 4, color: PALETTE.card, margin: 0 }}>
            Chuj – zápis bodov
          </h1>
        </div>

        {phase === "setup" && (
          <div style={{ borderRadius: 16, padding: 20, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, boxSizing: "border-box" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 16, color: PALETTE.ink }}>
              Zadaj mená hráčov
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {players.map((p, i) => (
                <input
                  key={i}
                  className="sedma-input"
                  value={p}
                  onChange={(e) => {
                    const np = [...players];
                    np[i] = e.target.value;
                    setPlayers(np);
                  }}
                  placeholder={`Hráč ${i + 1}`}
                  style={{
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 16,
                    outline: "none",
                    background: PALETTE.cardAlt,
                    border: `1.5px solid ${PALETTE.line}`,
                    color: PALETTE.ink,
                    fontFamily: FONT_BODY,
                    boxSizing: "border-box",
                    width: "100%",
                  }}
                />
              ))}
            </div>
            <button
              onClick={startGame}
              style={{
                width: "100%",
                marginTop: 20,
                borderRadius: 999,
                padding: "12px 0",
                fontWeight: 600,
                fontSize: 16,
                fontFamily: FONT_BODY,
                background: PALETTE.accent,
                color: PALETTE.ink,
                border: "none",
                cursor: "pointer",
              }}
            >
              Začať hru
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "finished") && (
          <>
            {/* Scoreboard */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {players.map((name, i) => {
                const t = totals[i];
                const out = t >= 101;
                const warn = !out && t >= 90;
                return (
                  <div
                    key={i}
                    style={{
                      borderRadius: 12,
                      padding: "12px 12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      background: PALETTE.card,
                      border: `2px solid ${out ? PALETTE.danger : warn ? PALETTE.warn : PALETTE.line}`,
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: PALETTE.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                      {name}
                    </div>
                    <div style={{ fontVariantNumeric: "tabular-nums", fontFamily: FONT_DISPLAY, fontSize: 24, color: out ? PALETTE.danger : PALETTE.ink }}>
                      {t}
                    </div>
                    {out && (
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: PALETTE.danger }}>
                        PREHRÁVA
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {phase === "finished" && (
              <div style={{ borderRadius: 16, padding: 20, marginBottom: 20, textAlign: "center", background: PALETTE.goldSoft, border: `1px solid ${PALETTE.gold}`, boxSizing: "border-box" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, marginBottom: 4, color: PALETTE.ink }}>
                  Hra skončila
                </div>
                <div style={{ fontSize: 14, marginBottom: 12, color: PALETTE.inkSoft }}>
                  {players.filter((_, i) => totals[i] >= 101).join(", ")} {totals.filter((t) => t >= 101).length > 1 ? "sú chuji" : "je chuj"}.
                  <br />
                  Vyhráva {players.filter((_, i) => totals[i] < 101).join(", ")}.
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={nextGameSamePlayers} style={{ borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, background: PALETTE.accent, color: PALETTE.ink, border: "none", cursor: "pointer" }}>
                    Ďalšia hra, rovnakí hráči
                  </button>
                  <button onClick={newPlayers} style={{ borderRadius: 999, padding: "8px 16px", fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY, background: PALETTE.cardAlt, color: PALETTE.ink, border: `1px solid ${PALETTE.line}`, cursor: "pointer" }}>
                    Noví hráči
                  </button>
                </div>
              </div>
            )}

            {phase === "playing" && (
              <div style={{ borderRadius: 16, padding: 20, marginBottom: 20, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, boxSizing: "border-box" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, marginBottom: 12, color: PALETTE.ink }}>
                  Kolo {rounds.length + 1}
                </div>

                {/* Bodka */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: PALETTE.ink }}>Bodka (nahlásená pred kolom)</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {players.map((name, i) => (
                      <PlayerChip
                        key={i}
                        name={name}
                        color={PALETTE.red}
                        active={bodka[i]}
                        onClick={() => {
                          const nb = [...bodka];
                          nb[i] = !nb[i];
                          setBodka(nb);
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, margin: "16px 0", background: PALETTE.line }} />

                {/* Víšniky, vedľa seba */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <AcornIcon size={16} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: PALETTE.ink }}>Žaluďový víšnik</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Toggle checked={acornOut} onChange={setAcornOut} label={acornOut ? "Vyložený" : "Nevyložený"} icon={<AcornIcon size={14} color={acornOut ? PALETTE.ink : PALETTE.gold} />} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {players.map((name, i) => (
                        <PlayerChip key={i} name={name} color={PALETTE.gold} active={acornTaker === i} onClick={() => setAcornTaker(i)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <LeafIcon size={16} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: PALETTE.ink }}>Zelený víšnik</span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Toggle checked={leafOut} onChange={setLeafOut} label={leafOut ? "Vyložený" : "Nevyložený"} icon={<LeafIcon size={14} color={leafOut ? PALETTE.ink : PALETTE.green} />} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {players.map((name, i) => (
                        <PlayerChip key={i} name={name} color={PALETTE.green} active={leafTaker === i} onClick={() => setLeafTaker(i)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, margin: "16px 0", background: PALETTE.line }} />

                {/* Red cards */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <HeartIcon />
                    <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.ink }}>Červené karty</span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 12,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: redSum === 8 ? PALETTE.greenSoft : PALETTE.redSoft,
                        color: redSum === 8 ? PALETTE.green : PALETTE.red,
                      }}
                    >
                      Súčet: {redSum}/8
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {players.map((name, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 8, padding: "8px 12px", background: PALETTE.cardAlt }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: PALETTE.ink }}>{name}</span>
                        <Stepper
                          value={redCounts[i]}
                          onChange={(v) => {
                            const nc = [...redCounts];
                            nc[i] = v;
                            setRedCounts(nc);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={submitRound}
                  disabled={!canSubmit}
                  style={{
                    width: "100%",
                    marginTop: 20,
                    borderRadius: 999,
                    padding: "12px 0",
                    fontWeight: 600,
                    fontSize: 16,
                    fontFamily: FONT_BODY,
                    background: canSubmit ? PALETTE.accent : PALETTE.line,
                    color: canSubmit ? PALETTE.ink : PALETTE.inkSoft,
                    border: "none",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
                  Zapísať kolo
                </button>
                {!canSubmit && (
                  <div style={{ fontSize: 12, textAlign: "center", marginTop: 8, color: PALETTE.inkSoft }}>
                    {redSum !== 8 ? "Súčet červených kariet musí byť presne 8." : "Vyber, kto zobral oboch víšnikov."}
                  </div>
                )}
              </div>
            )}

            {/* History / undo */}
            {rounds.length > 0 && (
              <div style={{ borderRadius: 16, padding: 16, marginBottom: 32, background: PALETTE.bgSoft, border: `1px solid ${PALETTE.line}`, boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <button onClick={() => setHistoryOpen(!historyOpen)} style={{ fontSize: 14, fontWeight: 600, color: PALETTE.card, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY, padding: 0 }}>
                    História kôl ({rounds.length}) {historyOpen ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={undoLast}
                    style={{ fontSize: 14, fontWeight: 600, borderRadius: 999, padding: "4px 12px", background: PALETTE.redSoft, color: PALETTE.red, border: "none", cursor: "pointer", fontFamily: FONT_BODY }}
                  >
                    ↺ Vrátiť posledné kolo
                  </button>
                </div>
                {historyOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {rounds.map((r, idx) => (
                      <div key={idx} style={{ fontSize: 12, borderRadius: 8, padding: "8px 12px", background: PALETTE.card, color: PALETTE.ink }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Kolo {idx + 1}
                          {r.sweepIdx !== -1 ? ` — ${players[r.sweepIdx]} zobral všetko` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontVariantNumeric: "tabular-nums" }}>
                          {players.map((name, i) => (
                            <span key={i}>
                              {name}: <b style={{ color: r.deltas[i] < 0 ? PALETTE.red : PALETTE.green }}>{r.deltas[i] >= 0 ? "+" : ""}{r.deltas[i]}</b>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
