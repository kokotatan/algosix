import React, { useMemo } from "react";

const C = {
  bg: "#ffffff",
  white: "#ffffff",
  black: "#111111",
  gray1: "#f0f0f0",
  gray2: "#d0d0d0",
  gray3: "#a0a0a0",
  gray4: "#606060",
  red: "#e03030",
  green: "#28a028",
};

const GEO_COLORS = [
  "#e03030", "#28a028", "#2070d0", "#d0a020",
  "#9040c0", "#e06020", "#20b0a0", "#c04080",
  "#5060d0", "#40a060",
];

export function GeometricBG() {
  const shapes = useMemo(() => {
    const items = [];
    // Circles
    const circleData = [
      { x: "5%", y: "8%", size: 80, color: GEO_COLORS[0] },
      { x: "85%", y: "5%", size: 60, color: GEO_COLORS[1] },
      { x: "10%", y: "75%", size: 55, color: GEO_COLORS[2] },
      { x: "90%", y: "80%", size: 70, color: GEO_COLORS[3] },
      { x: "15%", y: "40%", size: 35, color: GEO_COLORS[4] },
      { x: "75%", y: "35%", size: 45, color: GEO_COLORS[5] },
      { x: "50%", y: "90%", size: 40, color: GEO_COLORS[6] },
      { x: "30%", y: "15%", size: 28, color: GEO_COLORS[7] },
      { x: "92%", y: "50%", size: 30, color: GEO_COLORS[8] },
      { x: "3%", y: "55%", size: 50, color: GEO_COLORS[9] },
      { x: "60%", y: "12%", size: 42, color: GEO_COLORS[0] },
      { x: "40%", y: "70%", size: 38, color: GEO_COLORS[1] },
    ];
    circleData.forEach((c, i) => {
      items.push(
        <div
          key={`c${i}`}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            borderRadius: "50%",
            border: `1.5px solid ${c.color}`,
            opacity: 0.3,
            animation: `float ${6 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      );
    });

    const polyData = [
      { x: "20%", y: "20%", size: 30, sides: 3, color: GEO_COLORS[2], rot: 15 },
      { x: "80%", y: "15%", size: 25, sides: 5, color: GEO_COLORS[4], rot: 30 },
      { x: "70%", y: "70%", size: 28, sides: 6, color: GEO_COLORS[6], rot: 0 },
      { x: "25%", y: "85%", size: 22, sides: 4, color: GEO_COLORS[8], rot: 45 },
      { x: "88%", y: "30%", size: 20, sides: 3, color: GEO_COLORS[0], rot: 60 },
      { x: "8%", y: "30%", size: 26, sides: 5, color: GEO_COLORS[3], rot: 20 },
      { x: "55%", y: "5%", size: 18, sides: 6, color: GEO_COLORS[7], rot: 10 },
      { x: "45%", y: "85%", size: 24, sides: 4, color: GEO_COLORS[9], rot: 22 },
    ];
    polyData.forEach((p, i) => {
      const points = [];
      for (let j = 0; j < p.sides; j++) {
        const angle = (Math.PI * 2 * j) / p.sides - Math.PI / 2;
        points.push(
          `${50 + 45 * Math.cos(angle)},${50 + 45 * Math.sin(angle)}`
        );
      }
      items.push(
        <div
          key={`p${i}`}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            opacity: 0.25,
            transform: `rotate(${p.rot}deg)`,
            animation: `float ${7 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.7}s`,
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <polygon
              points={points.join(" ")}
              fill="none"
              stroke={p.color}
              strokeWidth="3"
            />
          </svg>
        </div>
      );
    });
    return items;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {shapes}
    </div>
  );
}

export function ScreenWrapper({ children, showGeo = true, scroll = false }) {
  return (
    <div
      style={{
        height: "100svh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        overflow: "hidden",
        animation: "fadeUp 1s ease",
        position: "relative",
      }}
    >
      {showGeo && <GeometricBG />}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: scroll ? "auto" : "hidden",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function OutlinedButton({ children, onClick, disabled = false, selected = false, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "14px 24px",
        borderRadius: 0,
        border: `2px solid ${disabled ? C.gray2 : C.black}`,
        background: selected ? C.black : C.white,
        color: selected ? C.white : disabled ? C.gray3 : C.black,
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "'Noto Sans JP', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        opacity: disabled ? 0.4 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function InputField({ value, onChange, placeholder, maxLength }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: "100%",
        padding: "12px",
        fontSize: 16,
        fontWeight: 700,
        fontFamily: "'Noto Sans JP', sans-serif",
        border: `2px solid ${C.black}`,
        borderRadius: 0,
        outline: "none",
        textAlign: "center",
      }}
    />
  );
}
