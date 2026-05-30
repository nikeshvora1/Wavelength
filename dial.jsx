// Spectrum dial - half-circle with scoring bands
// Props:
//   target: 0..100 (target center, only rendered when showTarget true)
//   guess: 0..100 or null
//   onGuessChange: (v) => void  -- if provided, dial is interactive
//   showTarget: bool
//   leftLabel, rightLabel: strings
//   leftAccent, rightAccent: hex strings for the gradient ends
//   compact: bool (smaller version)

const { useRef, useEffect, useCallback, useState } = React;

function SpectrumDial({
  target = 50,
  guess = null,
  onGuessChange = null,
  showTarget = false,
  leftLabel = "",
  rightLabel = "",
  leftAccent = "#5BC8E0",
  rightAccent = "#F08775",
  compact = false,
}) {
  const W = compact ? 520 : 880;
  const H = compact ? 280 : 460;
  const cx = W / 2;
  const cy = H - 30;
  const R = compact ? 230 : 400;
  const Rinner = R - (compact ? 130 : 220);
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const valueToAngle = (v) => -Math.PI + (Math.PI * v) / 100;
  const angleToValue = (a) => {
    let v = ((a + Math.PI) / Math.PI) * 100;
    return Math.max(0, Math.min(100, v));
  };
  const polar = (radius, angle) => [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];

  function bandPath(a1, a2, rOuter, rInner) {
    const [x1, y1] = polar(rOuter, a1);
    const [x2, y2] = polar(rOuter, a2);
    const [x3, y3] = polar(rInner, a2);
    const [x4, y4] = polar(rInner, a1);
    return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 0 0 ${x4} ${y4} Z`;
  }

  const W4 = 4;
  const W3 = 12;
  const W2 = 20;

  const tgtA = valueToAngle(target);
  const angleSpan = (halfWidth) => {
    const a1 = valueToAngle(Math.max(0, target - halfWidth));
    const a2 = valueToAngle(Math.min(100, target + halfWidth));
    return [a1, a2];
  };
  const [a2L, a2R] = angleSpan(W2);
  const [a3L, a3R] = angleSpan(W3);
  const [a4L, a4R] = angleSpan(W4);

  const guessVal = guess == null ? 50 : guess;
  const ptrA = valueToAngle(guessVal);
  const [ptx, pty] = polar(R - 4, ptrA);

  const handlePointerMove = useCallback((e) => {
    if (!onGuessChange) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    const dx = px - cx;
    const dy = py - cy;
    let a = Math.atan2(dy, dx);
    if (a > 0) a = dx < 0 ? -Math.PI : 0;
    const v = angleToValue(a);
    onGuessChange(v);
  }, [onGuessChange]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const ev = e.touches ? e.touches[0] : e;
      handlePointerMove(ev);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handlePointerMove]);

  const onDown = (e) => {
    if (!onGuessChange) return;
    e.preventDefault();
    setDragging(true);
    const ev = e.touches ? e.touches[0] : e;
    handlePointerMove(ev);
  };

  const ticks = [];
  for (let i = 0; i <= 20; i++) {
    const v = (i / 20) * 100;
    const a = valueToAngle(v);
    const isMajor = i % 5 === 0;
    const tlen = isMajor ? 14 : 7;
    const [tx1, ty1] = polar(R + 2, a);
    const [tx2, ty2] = polar(R + 2 + tlen, a);
    ticks.push(
      <line key={i} x1={tx1} y1={ty1} x2={tx2} y2={ty2}
        stroke="rgba(242,237,227,0.35)" strokeWidth={isMajor ? 2 : 1}/>
    );
  }

  const gradId = `dialgrad-${leftAccent}-${rightAccent}`.replace(/[^a-z0-9]/gi,'');

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dial"
         style={{ width: "100%", height: "auto", touchAction: "none", cursor: onGuessChange ? "grab" : "default" }}
         onMouseDown={onDown} onTouchStart={onDown}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={leftAccent} stopOpacity="0.18"/>
          <stop offset="50%" stopColor="#F2EDE3" stopOpacity="0.04"/>
          <stop offset="100%" stopColor={rightAccent} stopOpacity="0.18"/>
        </linearGradient>
        <radialGradient id="bullseye-glow" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#F5A623" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#F5A623" stopOpacity="0"/>
        </radialGradient>
        <filter id="blur1"><feGaussianBlur stdDeviation="6"/></filter>
      </defs>

      <path d={bandPath(-Math.PI, 0, R, Rinner)} fill={`url(#${gradId})`}/>

      <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
        fill="none" stroke="rgba(242,237,227,0.45)" strokeWidth="1.5"/>
      <path d={`M ${cx-Rinner} ${cy} A ${Rinner} ${Rinner} 0 0 1 ${cx+Rinner} ${cy}`}
        fill="none" stroke="rgba(242,237,227,0.25)" strokeWidth="1"/>

      {ticks}

      {showTarget && (
        <g>
          <path d={bandPath(a2L, a2R, R-2, Rinner+2)} fill="url(#bullseye-glow)" filter="url(#blur1)"/>
          <path d={bandPath(a2L, a3L, R-2, Rinner+2)} fill="#F5A623" fillOpacity="0.18" stroke="#F5A623" strokeOpacity="0.4" strokeWidth="1"/>
          <path d={bandPath(a3R, a2R, R-2, Rinner+2)} fill="#F5A623" fillOpacity="0.18" stroke="#F5A623" strokeOpacity="0.4" strokeWidth="1"/>
          <path d={bandPath(a3L, a4L, R-2, Rinner+2)} fill="#F5A623" fillOpacity="0.38" stroke="#F5A623" strokeOpacity="0.6" strokeWidth="1"/>
          <path d={bandPath(a4R, a3R, R-2, Rinner+2)} fill="#F5A623" fillOpacity="0.38" stroke="#F5A623" strokeOpacity="0.6" strokeWidth="1"/>
          <path d={bandPath(a4L, a4R, R-2, Rinner+2)} fill="#F5A623" fillOpacity="0.85" stroke="#F5A623" strokeWidth="1.5"/>
          <line x1={cx + (Rinner-6) * Math.cos(tgtA)} y1={cy + (Rinner-6) * Math.sin(tgtA)}
                x2={cx + (R+18) * Math.cos(tgtA)} y2={cy + (R+18) * Math.sin(tgtA)}
                stroke="#F5A623" strokeWidth="2" strokeDasharray="4 3"/>
          {[
            { v: target, txt: "4" },
            { v: target - (W3+W4)/2, txt: "3" },
            { v: target + (W3+W4)/2, txt: "3" },
            { v: target - (W2+W3)/2, txt: "2" },
            { v: target + (W2+W3)/2, txt: "2" },
          ].map((it, idx) => {
            if (it.v < 0 || it.v > 100) return null;
            const a = valueToAngle(it.v);
            const r = (R + Rinner) / 2;
            const [lx, ly] = polar(r, a);
            return <text key={idx} x={lx} y={ly+6} textAnchor="middle"
                          fill="#0B1220" fontFamily="JetBrains Mono, monospace"
                          fontSize={compact ? 14 : 20} fontWeight="700">{it.txt}</text>;
          })}
        </g>
      )}

      {guess != null && (
        <g>
          <line x1={cx} y1={cy} x2={ptx} y2={pty}
                stroke="#F2EDE3" strokeWidth="3" strokeLinecap="round"/>
          <circle cx={ptx} cy={pty} r={compact ? 8 : 12} fill="#F2EDE3" stroke="#0B1220" strokeWidth="2"/>
          <circle cx={cx} cy={cy} r={compact ? 10 : 14} fill="#F2EDE3" stroke="#0B1220" strokeWidth="2"/>
        </g>
      )}

      <text x={20} y={cy + 24} textAnchor="start"
            fontFamily="Space Grotesk, sans-serif" fontWeight="600"
            fontSize={compact ? 16 : 22} fill={leftAccent}>{leftLabel}</text>
      <text x={W-20} y={cy + 24} textAnchor="end"
            fontFamily="Space Grotesk, sans-serif" fontWeight="600"
            fontSize={compact ? 16 : 22} fill={rightAccent}>{rightLabel}</text>

      {onGuessChange && (
        <text x={cx} y={cy + 24} textAnchor="middle"
              fontFamily="JetBrains Mono, monospace" fontSize="11"
              fill="rgba(242,237,227,0.4)" letterSpacing="2">
          DRAG TO TUNE
        </text>
      )}
    </svg>
  );
}

window.SpectrumDial = SpectrumDial;
