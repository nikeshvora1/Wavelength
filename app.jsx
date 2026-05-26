// Wavelength-style party game — original UI
const { useState, useEffect, useRef, useMemo } = React;
const Dial = window.SpectrumDial;

const PAIRS = window.TAG_PAIRS;
const TEAM_PRESETS = [
  { name: "Cyan",   accent: "#5BC8E0" },
  { name: "Coral",  accent: "#F08775" },
  { name: "Lime",   accent: "#B8E05B" },
  { name: "Violet", accent: "#B79CF0" },
];

function pickPair(usedSet) {
  const available = PAIRS.filter(p => !usedSet.has(p.join("|")));
  const pool = available.length ? available : PAIRS;
  return pool[Math.floor(Math.random() * pool.length)];
}
function randTarget() { return 6 + Math.random() * 88; }
function scoreFor(target, guess) {
  const d = Math.abs(target - guess);
  if (d <= 4) return 4;
  if (d <= 9) return 3;
  if (d <= 16) return 2;
  return 0;
}

function App() {
  const [phase, setPhase] = useState("setup");
  const [teams, setTeams] = useState([
    { name: "TEAM CYAN",  accent: "#5BC8E0", score: 0 },
    { name: "TEAM CORAL", accent: "#F08775", score: 0 },
  ]);
  const [activeTeam, setActiveTeam] = useState(0);
  const [round, setRound] = useState(0);
  const [pair, setPair] = useState(["", ""]);
  const [target, setTarget] = useState(50);
  const [clue, setClue] = useState("");
  const [psychicName, setPsychicName] = useState("");
  const [guess, setGuess] = useState(50);
  const [opposingPick, setOpposingPick] = useState(null);
  const [usedPairs, setUsedPairs] = useState(new Set());
  const [lastResult, setLastResult] = useState(null);
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "winningScore": 10,
    "showRules": true
  }/*EDITMODE-END*/);

  const isOver = teams[0].score >= tweaks.winningScore || teams[1].score >= tweaks.winningScore;
  useEffect(() => { if (isOver && phase !== "gameover") setPhase("gameover"); }, [isOver]);

  function startGame(newTeams) {
    setTeams(newTeams.map(t => ({ ...t, score: 0 })));
    setActiveTeam(0);
    setRound(1);
    setUsedPairs(new Set());
    nextRound(0, new Set());
  }
  function nextRound(turn, used) {
    const p = pickPair(used);
    setPair(p);
    setUsedPairs(prev => { const n = new Set(prev); n.add(p.join("|")); return n; });
    setTarget(randTarget());
    setClue("");
    setPsychicName("");
    setGuess(50);
    setOpposingPick(null);
    setLastResult(null);
    setActiveTeam(turn);
    setPhase("reveal-psychic");
  }
  function resetGame() {
    setPhase("setup");
    setTeams(t => t.map(x => ({ ...x, score: 0 })));
    setUsedPairs(new Set());
    setRound(0);
  }

  function commitReveal() {
    const pts = scoreFor(target, guess);
    const opposingIdx = 1 - activeTeam;
    const opposingCorrect =
      opposingPick === "left" ? guess > target :
      opposingPick === "right" ? guess < target : false;
    const newTeams = teams.map((t, i) => {
      let bonus = 0;
      if (i === activeTeam) bonus = pts;
      if (i === opposingIdx && opposingCorrect && pts < 4) bonus = 1;
      return { ...t, score: t.score + bonus };
    });
    setTeams(newTeams);
    setLastResult({ pts, opposingCorrect, opposingPick });
    setPhase("reveal");
  }

  function advance() {
    if (teams[0].score >= tweaks.winningScore || teams[1].score >= tweaks.winningScore) {
      setPhase("gameover");
    } else {
      setRound(r => r + 1);
      nextRound(1 - activeTeam, usedPairs);
    }
  }

  return (
    <div className="app">
      <Header teams={teams} round={round} phase={phase}/>
      {phase === "setup" && <Setup onStart={startGame} initialTeams={teams}/>}
      {phase === "reveal-psychic" && (
        <RevealPsychic
          team={teams[activeTeam]}
          onConfirm={(name) => { setPsychicName(name); setPhase("psychic"); }}
        />
      )}
      {phase === "psychic" && (
        <PsychicView
          team={teams[activeTeam]} pair={pair} target={target}
          psychicName={psychicName} clue={clue} setClue={setClue}
          onSubmit={() => setPhase("team-guess")}
        />
      )}
      {phase === "team-guess" && (
        <TeamGuess
          team={teams[activeTeam]} pair={pair}
          clue={clue} psychicName={psychicName}
          guess={guess} setGuess={setGuess}
          onLock={() => setPhase("opposing")}
        />
      )}
      {phase === "opposing" && (
        <OpposingPick
          team={teams[1 - activeTeam]}
          activeTeam={teams[activeTeam]}
          pair={pair} clue={clue} guess={guess}
          pick={opposingPick} setPick={setOpposingPick}
          onLock={commitReveal}
        />
      )}
      {phase === "reveal" && (
        <Reveal
          teams={teams} activeTeam={activeTeam} pair={pair}
          target={target} guess={guess} clue={clue}
          result={lastResult} winningScore={tweaks.winningScore}
          onNext={advance}
        />
      )}
      {phase === "gameover" && (
        <GameOver teams={teams} onReset={resetGame}/>
      )}
      {tweaks.showRules && phase !== "setup" && phase !== "gameover" && <RulesLegend/>}
      <TweaksPanel title="TWEAKS">
        <TweakSection title="Game">
          <TweakSlider label="Winning score" value={tweaks.winningScore}
            min={4} max={25} step={1}
            onChange={v => setTweak('winningScore', v)}/>
          <TweakToggle label="Scoring legend" value={tweaks.showRules}
            onChange={v => setTweak('showRules', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function RulesLegend() {
  return (
    <div className="rules-legend">
      <div className="rl-title">SCORING</div>
      <div className="rl-row"><span className="rl-band b4"/><span className="rl-num">4</span><span>bullseye</span></div>
      <div className="rl-row"><span className="rl-band b3"/><span className="rl-num">3</span><span>close</span></div>
      <div className="rl-row"><span className="rl-band b2"/><span className="rl-num">2</span><span>near</span></div>
      <div className="rl-row"><span className="rl-band b1"/><span className="rl-num">1</span><span>opposing L/R bonus</span></div>
    </div>
  );
}

function Header({ teams, round, phase }) {
  const label =
    phase === "setup" ? "CALIBRATING" :
    phase === "gameover" ? "FINAL READOUT" :
    `ROUND ${String(round).padStart(2, "0")}`;
  return (
    <header className="hdr">
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 40 40" width="32" height="32">
            <path d="M 4 22 Q 12 8, 20 22 T 36 22" fill="none" stroke="#F5A623" strokeWidth="2.5"/>
            <circle cx="20" cy="22" r="2.2" fill="#F2EDE3"/>
          </svg>
        </div>
        <div>
          <div className="brand-name">WAVELENGTH</div>
          <div className="brand-sub">{label}</div>
        </div>
      </div>
      {phase !== "setup" && (
        <div className="scoreboard">
          {teams.map((t, i) => (
            <div className="team-score" key={i}>
              <span className="team-pip" style={{ background: t.accent }}/>
              <span className="team-name">{t.name}</span>
              <span className="team-num">{String(t.score).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

function Setup({ onStart, initialTeams }) {
  const [t1, setT1] = useState(initialTeams[0].name);
  const [t2, setT2] = useState(initialTeams[1].name);
  const [a1, setA1] = useState(initialTeams[0].accent);
  const [a2, setA2] = useState(initialTeams[1].accent);
  return (
    <main className="setup">
      <div className="setup-card">
        <div className="kicker">— NEW TRANSMISSION —</div>
        <h1>Tune in.<br/>Read your team's mind.</h1>
        <p className="lede">
          One player sees a hidden target on a spectrum between two opposing
          ideas. They give a clue. Their team turns the dial.
          The other team guesses which side the truth is hiding on.
        </p>

        <div className="team-setup">
          {[
            { name: t1, setName: setT1, accent: a1, setAccent: setA1, idx: 0 },
            { name: t2, setName: setT2, accent: a2, setAccent: setA2, idx: 1 },
          ].map((t) => (
            <div className="team-edit" key={t.idx}>
              <div className="team-label">TEAM {String.fromCharCode(65 + t.idx)}</div>
              <input className="team-input" value={t.name}
                     onChange={e => t.setName(e.target.value.toUpperCase())}
                     maxLength={18}
                     style={{ borderBottomColor: t.accent }}/>
              <div className="swatches">
                {TEAM_PRESETS.map(p => (
                  <button key={p.accent}
                    className={`swatch ${p.accent === t.accent ? "on" : ""}`}
                    style={{ background: p.accent }}
                    onClick={() => t.setAccent(p.accent)}/>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="primary" onClick={() => onStart([
          { name: t1.trim() || "TEAM A", accent: a1 },
          { name: t2.trim() || "TEAM B", accent: a2 },
        ])}>
          BEGIN BROADCAST  →
        </button>

        <div className="rules-mini">
          <div><span className="rule-num">04</span>bullseye</div>
          <div><span className="rule-num">03</span>close</div>
          <div><span className="rule-num">02</span>near</div>
          <div><span className="rule-num">01</span>opposing side bonus</div>
        </div>
      </div>
      <div className="setup-art">
        <Dial target={50} guess={50} showTarget leftLabel="←" rightLabel="→"
              leftAccent={a1} rightAccent={a2} />
      </div>
    </main>
  );
}

function RevealPsychic({ team, onConfirm }) {
  const [name, setName] = useState("");
  return (
    <main className="full center">
      <div className="card-mid" style={{ borderColor: team.accent }}>
        <div className="kicker" style={{ color: team.accent }}>— TRANSMITTER —</div>
        <h2>{team.name}'s turn at the dial.</h2>
        <p className="lede">Pick one teammate to be the <em>Psychic</em>. Only they will see the target.</p>
        <label className="field">
          <span>PSYCHIC NAME (optional)</span>
          <input value={name} onChange={e => setName(e.target.value)}
                 placeholder="who's holding the device?"
                 style={{ borderBottomColor: team.accent }}/>
        </label>
        <button className="primary" style={{ background: team.accent, color: "#0B1220" }}
                onClick={() => onConfirm(name.trim())}>
          I'M THE PSYCHIC  →
        </button>
        <div className="muted small">Everyone else: look away.</div>
      </div>
    </main>
  );
}

function PsychicView({ team, pair, target, psychicName, clue, setClue, onSubmit }) {
  const [hidden, setHidden] = useState(true);
  return (
    <main className="full">
      <div className="psy-wrap">
        <div className="psy-meta">
          <div className="kicker" style={{ color: team.accent }}>— PSYCHIC ONLY —</div>
          <h2>{psychicName ? `${psychicName},` : "Psychic,"} where's the signal?</h2>
          <p className="muted">Find a clue that points your team exactly here. Then pass the device.</p>
        </div>

        <div className={`psy-dial ${hidden ? "blurred" : ""}`} onClick={() => setHidden(false)}>
          <Dial target={target} guess={null} showTarget
                leftLabel={pair[0]} rightLabel={pair[1]}
                leftAccent={team.accent} rightAccent="#F2EDE3"/>
          {hidden && (
            <div className="reveal-overlay">
              <div className="reveal-overlay-inner">
                <div className="kicker">— TARGET LOCKED —</div>
                <div className="big">TAP TO VIEW</div>
                <div className="muted small">Confirm only you are looking.</div>
              </div>
            </div>
          )}
        </div>

        <div className="psy-clue">
          <label className="field big-field">
            <span>YOUR CLUE</span>
            <input value={clue} onChange={e => setClue(e.target.value)}
                   placeholder="a word, a phrase, a song title…"
                   style={{ borderBottomColor: team.accent }}/>
          </label>
          <button className="primary" style={{ background: team.accent, color: "#0B1220" }}
                  disabled={!clue.trim() || hidden}
                  onClick={onSubmit}>
            TRANSMIT CLUE  →
          </button>
        </div>
      </div>
    </main>
  );
}

function TeamGuess({ team, pair, clue, psychicName, guess, setGuess, onLock }) {
  return (
    <main className="full">
      <div className="round-wrap">
        <div className="round-meta">
          <div className="kicker" style={{ color: team.accent }}>
            — {team.name} GUESSES —
          </div>
          <h2>Where on the spectrum?</h2>
          <p className="muted">
            {psychicName ? psychicName : "Your psychic"} says:
          </p>
          <div className="clue-card" style={{ borderColor: team.accent }}>
            <span className="quote">"</span>
            {clue}
            <span className="quote">"</span>
          </div>
        </div>
        <div className="round-dial">
          <Dial target={null} guess={guess} onGuessChange={setGuess}
                leftLabel={pair[0]} rightLabel={pair[1]}
                leftAccent={team.accent} rightAccent="#F2EDE3"/>
        </div>
        <div className="round-actions">
          <button className="primary" style={{ background: team.accent, color: "#0B1220" }} onClick={onLock}>
            LOCK GUESS  →
          </button>
        </div>
      </div>
    </main>
  );
}

function OpposingPick({ team, activeTeam, pair, clue, guess, pick, setPick, onLock }) {
  return (
    <main className="full">
      <div className="round-wrap">
        <div className="round-meta">
          <div className="kicker" style={{ color: team.accent }}>— {team.name} INTERCEPTS —</div>
          <h2>Is the true target left or right of their guess?</h2>
          <p className="muted">
            {activeTeam.name} placed the dial here on the clue
            <span className="inline-clue">"{clue}"</span>.
            Beat them to one side and steal a point.
          </p>
        </div>

        <div className="round-dial">
          <Dial guess={guess} target={null}
                leftLabel={pair[0]} rightLabel={pair[1]}
                leftAccent={activeTeam.accent} rightAccent="#F2EDE3"/>
        </div>

        <div className="lr-picker">
          <button className={`lr-btn ${pick === "left" ? "on" : ""}`}
                  style={{ borderColor: team.accent, color: pick === "left" ? "#0B1220" : team.accent,
                           background: pick === "left" ? team.accent : "transparent" }}
                  onClick={() => setPick("left")}>
            ← LEFT OF DIAL<br/>
            <span className="lr-sub">"{pair[0]}" side</span>
          </button>
          <button className={`lr-btn ${pick === "right" ? "on" : ""}`}
                  style={{ borderColor: team.accent, color: pick === "right" ? "#0B1220" : team.accent,
                           background: pick === "right" ? team.accent : "transparent" }}
                  onClick={() => setPick("right")}>
            RIGHT OF DIAL →<br/>
            <span className="lr-sub">"{pair[1]}" side</span>
          </button>
        </div>

        <div className="round-actions">
          <button className="primary"
                  style={{ background: team.accent, color: "#0B1220" }}
                  disabled={!pick}
                  onClick={onLock}>
            REVEAL TARGET  →
          </button>
        </div>
      </div>
    </main>
  );
}

function Reveal({ teams, activeTeam, pair, target, guess, clue, result, winningScore, onNext }) {
  const at = teams[activeTeam];
  const ot = teams[1 - activeTeam];
  return (
    <main className="full">
      <div className="round-wrap">
        <div className="round-meta center-text">
          <div className="kicker">— READOUT —</div>
          <h2>{result.pts === 4 ? "Bullseye." : result.pts > 0 ? "Locked on." : "Off-frequency."}</h2>
          <div className="clue-card" style={{ borderColor: at.accent, margin: "0 auto" }}>
            <span className="quote">"</span>{clue}<span className="quote">"</span>
          </div>
        </div>
        <div className="round-dial">
          <Dial target={target} guess={guess} showTarget
                leftLabel={pair[0]} rightLabel={pair[1]}
                leftAccent={at.accent} rightAccent="#F2EDE3"/>
        </div>
        <div className="score-strip">
          <div className="ss-block">
            <div className="ss-label" style={{ color: at.accent }}>{at.name}</div>
            <div className="ss-pts">+{result.pts}</div>
            <div className="ss-total">→ {String(at.score).padStart(2, "0")}/{winningScore}</div>
          </div>
          <div className="ss-block">
            <div className="ss-label" style={{ color: ot.accent }}>{ot.name}</div>
            <div className="ss-pts">+{result.opposingCorrect && result.pts < 4 ? 1 : 0}</div>
            <div className="ss-detail">
              {result.opposingPick
                ? `guessed ${result.opposingPick.toUpperCase()} — ${result.opposingCorrect ? "correct" : "wrong"}`
                : ""}
            </div>
            <div className="ss-total">→ {String(ot.score).padStart(2, "0")}/{winningScore}</div>
          </div>
        </div>
        <div className="round-actions">
          <button className="primary" onClick={onNext}>NEXT ROUND  →</button>
        </div>
      </div>
    </main>
  );
}

function GameOver({ teams, onReset }) {
  const winner = teams[0].score >= teams[1].score ? teams[0] : teams[1];
  const tie = teams[0].score === teams[1].score;
  return (
    <main className="full center">
      <div className="card-mid" style={{ borderColor: winner.accent }}>
        <div className="kicker">— TRANSMISSION COMPLETE —</div>
        {tie ? <h2>Dead heat.</h2> : (
          <h2><span style={{ color: winner.accent }}>{winner.name}</span><br/>are on frequency.</h2>
        )}
        <div className="final-scores">
          {teams.map((t, i) => (
            <div className="final-row" key={i}>
              <span className="team-pip" style={{ background: t.accent }}/>
              <span style={{ color: t.accent, flex: 1 }}>{t.name}</span>
              <span className="big-num">{String(t.score).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
        <button className="primary" onClick={onReset}>NEW GAME  →</button>
      </div>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
