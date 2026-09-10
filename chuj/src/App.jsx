import { useState, useEffect, useMemo } from "react";

const PALETTE = {
  bg: "#241a12",
  bgSoft: "#3a2a1c",
  card: "#f6eeE1",
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

function loadFont() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
      .sedma-root { font-family: 'Inter', sans-serif; }
      .sedma-display { font-family: 'Fraunces', serif; font-variation-settings: 'opsz' 40; }
      .sedma-num { font-variant-numeric: tabular-nums; }
      .sedma-chip { transition: transform .12s ease, box-shadow .12s ease; }
      .sedma-chip:active { transform: scale(0.96); }
    `}</style>
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
      className="sedma-chip flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium"
      style={{
        background: checked ? PALETTE.accent : PALETTE.cardAlt,
        color: checked ? PALETTE.ink : PALETTE.inkSoft,
        border: `1.5px solid ${checked ? PALETTE.accent : PALETTE.line}`,
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
      className="sedma-chip rounded-lg px-3 py-2 text-sm font-semibold border-2"
      style={{
        background: active ? color : PALETTE.card,
        color: active ? "#fff" : PALETTE.ink,
        borderColor: active ? color : PALETTE.line,
      }}
    >
      {name}
    </button>
  );
}

function Stepper({ value, onChange, max = 8 }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center"
        style={{ background: PALETTE.cardAlt, color: PALETTE.ink, border: `1.5px solid ${PALETTE.line}` }}
      >
        –
      </button>
      <div className="w-7 text-center sedma-num font-bold text-lg" style={{ color: PALETTE.ink }}>
        {value}
      </div>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-full text-lg font-bold flex items-center justify-center"
        style={{ background: PALETTE.cardAlt, color: PALETTE.ink, border: `1.5px solid ${PALETTE.line}` }}
      >
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

  const losers = totals.map((t, i) => t >= 101).map((v, i) => v);
  const anyoneOut = totals.some((t) => t >= 101);

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
      <div className="sedma-root min-h-[400px] flex items-center justify-center" style={{ background: PALETTE.bg, color: PALETTE.card }}>
        {loadFont()}
        <div className="sedma-display text-lg">Načítavam hru…</div>
      </div>
    );
  }

  return (
    <div className="sedma-root min-h-[600px] w-full" style={{ background: PALETTE.bg }}>
      {loadFont()}

      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <HeartIcon /> <AcornIcon /> <LeafIcon />
          <h1 className="sedma-display text-2xl ml-1" style={{ color: PALETTE.card }}>
            Chuj – zápis bodov
          </h1>
        </div>

        {phase === "setup" && (
          <div className="rounded-2xl p-5" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}>
            <div className="sedma-display text-lg mb-4" style={{ color: PALETTE.ink }}>
              Zadaj mená hráčov
            </div>
            <div className="flex flex-col gap-3">
              {players.map((p, i) => (
                <input
                  key={i}
                  value={p}
                  onChange={(e) => {
                    const np = [...players];
                    np[i] = e.target.value;
                    setPlayers(np);
                  }}
                  placeholder={`Hráč ${i + 1}`}
                  className="rounded-lg px-3 py-2 text-base outline-none"
                  style={{ background: PALETTE.cardAlt, border: `1.5px solid ${PALETTE.line}`, color: PALETTE.ink }}
                />
              ))}
            </div>
            <button
              onClick={startGame}
              className="w-full mt-5 rounded-full py-3 font-semibold text-base"
              style={{ background: PALETTE.accent, color: PALETTE.ink }}
            >
              Začať hru
            </button>
          </div>
        )}

        {(phase === "playing" || phase === "finished") && (
          <>
            {/* Scoreboard */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {players.map((name, i) => {
                const t = totals[i];
                const out = t >= 101;
                const warn = !out && t >= 90;
                return (
                  <div
                    key={i}
                    className="rounded-xl px-3 py-3 flex flex-col items-center"
                    style={{
                      background: PALETTE.card,
                      border: `2px solid ${out ? PALETTE.danger : warn ? PALETTE.warn : PALETTE.line}`,
                    }}
                  >
                    <div className="text-xs font-semibold truncate max-w-full" style={{ color: PALETTE.inkSoft }}>
                      {name}
                    </div>
                    <div className="sedma-num sedma-display text-2xl" style={{ color: out ? PALETTE.danger : PALETTE.ink }}>
                      {t}
                    </div>
                    {out && (
                      <div className="text-[10px] font-bold tracking-wide" style={{ color: PALETTE.danger }}>
                        PREHRÁVA
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {phase === "finished" && (
              <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: PALETTE.goldSoft, border: `1px solid ${PALETTE.gold}` }}>
                <div className="sedma-display text-xl mb-1" style={{ color: PALETTE.ink }}>
                  Hra skončila
                </div>
                <div className="text-sm mb-3" style={{ color: PALETTE.inkSoft }}>
                  {players.filter((_, i) => totals[i] >= 101).join(", ")} {totals.filter((t) => t >= 101).length > 1 ? "sú chuji" : "je chuj"}.
                  <br />
                  Vyhráva {players.filter((_, i) => totals[i] < 101).join(", ")}.
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={nextGameSamePlayers} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: PALETTE.accent, color: PALETTE.ink }}>
                    Ďalšia hra, rovnakí hráči
                  </button>
                  <button onClick={newPlayers} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ background: PALETTE.cardAlt, color: PALETTE.ink, border: `1px solid ${PALETTE.line}` }}>
                    Noví hráči
                  </button>
                </div>
              </div>
            )}

            {phase === "playing" && (
              <div className="rounded-2xl p-5 mb-5" style={{ background: PALETTE.card, border: `1px solid ${PALETTE.line}` }}>
                <div className="sedma-display text-lg mb-3" style={{ color: PALETTE.ink }}>
                  Kolo {rounds.length + 1}
                </div>

                {/* Bodka */}
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2" style={{ color: PALETTE.ink }}>Bodka (nahlásená pred kolom)</div>
                  <div className="flex flex-wrap gap-2">
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

                <div className="h-px my-4" style={{ background: PALETTE.line }} />

                {/* Víšniky, vedľa seba */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <AcornIcon size={16} />
                      <span className="text-xs font-semibold" style={{ color: PALETTE.ink }}>Žaluďový víšnik</span>
                    </div>
                    <div className="mb-2">
                      <Toggle checked={acornOut} onChange={setAcornOut} label={acornOut ? "Vyložený" : "Nevyložený"} icon={<AcornIcon size={14} color={acornOut ? PALETTE.ink : PALETTE.gold} />} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {players.map((name, i) => (
                        <PlayerChip key={i} name={name} color={PALETTE.gold} active={acornTaker === i} onClick={() => setAcornTaker(i)} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <LeafIcon size={16} />
                      <span className="text-xs font-semibold" style={{ color: PALETTE.ink }}>Zelený víšnik</span>
                    </div>
                    <div className="mb-2">
                      <Toggle checked={leafOut} onChange={setLeafOut} label={leafOut ? "Vyložený" : "Nevyložený"} icon={<LeafIcon size={14} color={leafOut ? PALETTE.ink : PALETTE.green} />} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {players.map((name, i) => (
                        <PlayerChip key={i} name={name} color={PALETTE.green} active={leafTaker === i} onClick={() => setLeafTaker(i)} />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-px my-4" style={{ background: PALETTE.line }} />

                {/* Red cards */}
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <HeartIcon />
                    <span className="text-sm font-semibold" style={{ color: PALETTE.ink }}>Červené karty</span>
                    <span
                      className="ml-auto text-xs font-bold sedma-num px-2 py-1 rounded-full"
                      style={{
                        background: redSum === 8 ? PALETTE.greenSoft : PALETTE.redSoft,
                        color: redSum === 8 ? PALETTE.green : PALETTE.red,
                      }}
                    >
                      Súčet: {redSum}/8
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {players.map((name, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: PALETTE.cardAlt }}>
                        <span className="text-sm font-medium" style={{ color: PALETTE.ink }}>{name}</span>
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
                  className="w-full mt-5 rounded-full py-3 font-semibold text-base"
                  style={{
                    background: canSubmit ? PALETTE.accent : PALETTE.line,
                    color: canSubmit ? PALETTE.ink : PALETTE.inkSoft,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                  }}
                >
                  Zapísať kolo
                </button>
                {!canSubmit && (
                  <div className="text-xs text-center mt-2" style={{ color: PALETTE.inkSoft }}>
                    {redSum !== 8 ? "Súčet červených kariet musí byť presne 8." : "Vyber, kto zobral oboch víšnikov."}
                  </div>
                )}
              </div>
            )}

            {/* History / undo */}
            {rounds.length > 0 && (
              <div className="rounded-2xl p-4 mb-8" style={{ background: PALETTE.bgSoft, border: `1px solid ${PALETTE.line}` }}>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setHistoryOpen(!historyOpen)} className="text-sm font-semibold" style={{ color: PALETTE.card }}>
                    História kôl ({rounds.length}) {historyOpen ? "▲" : "▼"}
                  </button>
                  <button
                    onClick={undoLast}
                    className="text-sm font-semibold rounded-full px-3 py-1"
                    style={{ background: PALETTE.redSoft, color: PALETTE.red }}
                  >
                    ↺ Vrátiť posledné kolo
                  </button>
                </div>
                {historyOpen && (
                  <div className="flex flex-col gap-2 mt-2">
                    {rounds.map((r, idx) => (
                      <div key={idx} className="text-xs rounded-lg px-3 py-2" style={{ background: PALETTE.card, color: PALETTE.ink }}>
                        <div className="font-semibold mb-1">
                          Kolo {idx + 1}
                          {r.sweepIdx !== -1 ? ` — ${players[r.sweepIdx]} zobral všetko` : ""}
                        </div>
                        <div className="flex gap-3 flex-wrap sedma-num">
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
