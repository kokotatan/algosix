"use client";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  GameBoard,
  ActionPanel,
  GameLog,
  Card,
} from "./GameUI";
import Tutorial from "./Tutorial";
import { runCpuTurn, CpuKnowledge } from "../lib/cpuAI";
import {
  initGame,
  drawCard,
  attack,
  stayAction,
  continueAction,
  getCardSize,
  getTeam,
  getPartnerIndex,
  isAttackable,
  partnerToss,
  startAttackFromToss,
  pairAttack,
  pairStayAction,
  pairContinueAction,
} from "../lib/gameLogic";

/* ─── Design Tokens ─── */
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
  border: "#222222",
};

/* ─── Geometric Decoration Colors ─── */
const GEO_COLORS = [
  "#e03030", "#28a028", "#2070d0", "#d0a020",
  "#9040c0", "#e06020", "#20b0a0", "#c04080",
  "#5060d0", "#40a060",
];

/* ─── Geometric Background Decorations ─── */
function GeometricBG() {
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

    // Polygons (triangles, squares, pentagons, hexagons as SVG outlines)
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

/* ─── Screen wrapper ─── */
function ScreenWrapper({ children, showGeo = true }) {
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
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Outlined Button ─── */
function OutlinedButton({ children, onClick, disabled = false, selected = false, style = {} }) {
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

/* ─── Menu Screen ─── */
function MenuScreen({ onNavigate }) {
  return (
    <ScreenWrapper>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              fontFamily: "'Inter', sans-serif",
              color: C.black,
              letterSpacing: -3,
              margin: 0,
              lineHeight: 1,
            }}
          >
            algosi
            <span style={{ fontStyle: "italic" }}>X</span>
          </h1>
          <p
            style={{
              fontSize: 14,
              color: C.gray4,
              fontFamily: "'Noto Sans JP', sans-serif",
              margin: "8px 0 0",
              letterSpacing: 4,
            }}
          >
            論理カードゲーム
          </p>
        </div>

        {/* Menu Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
            maxWidth: 320,
          }}
        >
          <OutlinedButton
            onClick={() => onNavigate("tutorial")}
            style={{ padding: "18px 24px", fontSize: 18 }}
          >
            初めての方はこちら
          </OutlinedButton>

          <OutlinedButton
            onClick={() => onNavigate("setup")}
            style={{ padding: "18px 24px", fontSize: 18 }}
          >
            オフライン戦
          </OutlinedButton>

          <div style={{ display: "flex", gap: 12 }}>
            <OutlinedButton
              disabled={true}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              オンライン戦
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>（作成）</span>
            </OutlinedButton>
            <OutlinedButton
              disabled={true}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              オンライン戦
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>（参加）</span>
            </OutlinedButton>
            <OutlinedButton
              onClick={() => onNavigate("setup_cpu")}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              コンピュータ戦
            </OutlinedButton>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 16,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: C.gray3,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 1,
            }}
          >
            Produced by algo
          </span>
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ─── Setup Screen ─── */
function SetupScreen({ isCpuMode, onStart, onBack }) {
  // Config
  const [playerCount, setPlayerCount] = useState(isCpuMode ? 2 : 4);
  const [mode, setMode] = useState("individual"); // individual or pair
  const [names, setNames] = useState(["Player1", "Player2", "Player3", "Player4"]);
  const [step, setStep] = useState("config"); // config or names

  // CPU Specific Config
  const [cpuCount, setCpuCount] = useState(1);
  const [partnerType, setPartnerType] = useState("cpu"); // "cpu" or "human"
  const [cpuLevel, setCpuLevel] = useState("normal");

  const handleCountChange = (count) => {
    setPlayerCount(count);
    const newNames = Array.from({ length: count }, (_, i) => names[i] || `Player${i + 1}`);
    setNames(newNames);
    if (!(count % 2 === 0 && count >= 4)) {
      setMode("individual");
    }
  };

  const handleNameChange = (index, value) => {
    const newNames = [...names];
    newNames[index] = value;
    setNames(newNames);
  };

  const canStart = names.slice(0, playerCount).every((n) => n.trim().length > 0) || isCpuMode;

  const handleStart = () => {
    if (canStart) {
      if (isCpuMode) {
        let cpuConfig = [];
        let finalNames = [...names.slice(0, playerCount).map(n => n.trim() || "Player")];
        if (mode === "individual") {
          cpuConfig = Array.from({ length: playerCount }, (_, i) => i > 0 && i <= cpuCount);
          for (let i = 1; i <= cpuCount; i++) finalNames[i] = `CPU-${i}`;
        } else {
          cpuConfig = Array.from({ length: playerCount }, (_, i) => {
            if (i === 0) return false;
            if (i === 2) return partnerType === "cpu";
            return true;
          });
          finalNames[1] = "CPU-1 (敵)";
          finalNames[3] = "CPU-2 (敵)";
          if (partnerType === "cpu") finalNames[2] = "CPU (味方)";
        }
        onStart(finalNames, mode, { level: cpuLevel, cpuConfig });
      } else {
        onStart(names.slice(0, playerCount).map((n) => n.trim()), mode);
      }
    }
  };

  // Pair mode only available when even number of players
  const canPair = playerCount % 2 === 0 && playerCount >= 4;

  return (
    <ScreenWrapper>
      {step === "config" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 28,
          }}
        >
          {/* Back button */}
          <button
            onClick={onBack}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "6px 16px",
              border: `1.5px solid ${C.gray2}`,
              background: C.white,
              color: C.gray4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Noto Sans JP', sans-serif",
              zIndex: 2,
            }}
          >
            ← 戻る
          </button>

          {/* Title Logo */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "'Inter', sans-serif",
              color: C.black,
              letterSpacing: -2,
              margin: 0,
            }}
          >
            algosi<span style={{ fontStyle: "italic" }}>X</span>
          </h1>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.black,
              fontFamily: "'Noto Sans JP', sans-serif",
              margin: 0,
            }}
          >
            人数・モード選択
          </h2>

          {/* Player Count */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.black,
                marginBottom: 12,
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              プレイ人数を選択してください
            </div>
            <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
              {[2, 3, 4, 6].map((n) => (
                <OutlinedButton
                  key={n}
                  onClick={() => handleCountChange(n)}
                  selected={playerCount === n}
                  style={{
                    width: 64,
                    height: 56,
                    fontSize: 18,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {n}人
                </OutlinedButton>
              ))}
            </div>
          </div>


          {/* Mode Selection */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.black,
                marginBottom: 12,
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              対戦モードを選択してください
            </div>
            <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
              <OutlinedButton
                onClick={() => setMode("individual")}
                selected={mode === "individual"}
                style={{ width: 140, height: 56, fontSize: 18, padding: 0 }}
              >
                個人戦
              </OutlinedButton>
              <OutlinedButton
                onClick={() => canPair && setMode("pair")}
                selected={mode === "pair"}
                disabled={!canPair}
                style={{ width: 140, height: 56, fontSize: 18, padding: 0 }}
              >
                ペア戦
              </OutlinedButton>
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.gray3,
                marginTop: 8,
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              *人数によってペア戦が選べます
            </div>
          </div>

          {/* CPU Config */}
          {isCpuMode && mode === "individual" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                CPUの数
              </div>
              <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
                {[1, 2, 3].map(n => n < playerCount && (
                  <OutlinedButton
                    key={n}
                    onClick={() => setCpuCount(n)}
                    selected={cpuCount === n}
                    style={{ width: 64, height: 56, fontSize: 16, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {n}体
                  </OutlinedButton>
                ))}
              </div>
            </div>
          )}

          {isCpuMode && mode === "pair" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                パートナー
              </div>
              <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
                <OutlinedButton
                  onClick={() => setPartnerType("cpu")}
                  selected={partnerType === "cpu"}
                  style={{ padding: "12px 24px", fontSize: 15 }}
                >
                  CPU
                </OutlinedButton>
                <OutlinedButton
                  onClick={() => setPartnerType("human")}
                  selected={partnerType === "human"}
                  style={{ padding: "12px 24px", fontSize: 15 }}
                >
                  同じ端末の人間
                </OutlinedButton>
              </div>
            </div>
          )}

          {isCpuMode && (
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.black, marginBottom: 12, fontFamily: "'Noto Sans JP', sans-serif" }}>
                CPUの強さ
              </div>
              <div style={{ display: "flex", gap: 0, justifyContent: "center" }}>
                <OutlinedButton onClick={() => setCpuLevel("easy")} selected={cpuLevel === "easy"} style={{ padding: "12px 16px", fontSize: 13 }}>
                  EASY (ランダム)
                </OutlinedButton>
                <OutlinedButton onClick={() => setCpuLevel("normal")} selected={cpuLevel === "normal"} style={{ padding: "12px 16px", fontSize: 13 }}>
                  NORMAL (基本推論)
                </OutlinedButton>
              </div>
            </div>
          )}

          {/* Next Button */}
          <button
            onClick={() => setStep("names")}
            style={{
              width: "100%",
              maxWidth: 320,
              padding: "16px 24px",
              border: "none",
              background: C.gray2,
              color: C.gray4,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Noto Sans JP', sans-serif",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.black;
              e.currentTarget.style.color = C.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.gray2;
              e.currentTarget.style.color = C.gray4;
            }}
          >
            プレイヤー名入力へ
          </button>
        </div>
      ) : (
        /* Name Input Step */
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            gap: 20,
          }}
        >
          <button
            onClick={() => setStep("config")}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "6px 16px",
              border: `1.5px solid ${C.gray2}`,
              background: C.white,
              color: C.gray4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Noto Sans JP', sans-serif",
              zIndex: 2,
            }}
          >
            ← 戻る
          </button>

          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: C.black,
              fontFamily: "'Noto Sans JP', sans-serif",
              margin: 0,
            }}
          >
            プレイヤー名入力
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              width: "100%",
              maxWidth: 320,
            }}
          >
            {Array.from({ length: playerCount }, (_, i) => (
              <div key={i}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.black,
                    fontFamily: "'Noto Sans JP', sans-serif",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  プレイヤー {i + 1}
                </label>
                <input
                  type="text"
                  value={names[i] || ""}
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder="名前を入力"
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: `2px solid ${C.black}`,
                    fontSize: 16,
                    fontFamily: "'Noto Sans JP', sans-serif",
                    background: C.white,
                    boxSizing: "border-box",
                    transition: "border 0.2s",
                    borderRadius: 0,
                  }}
                />
              </div>
            ))}
          </div>

          <OutlinedButton
            onClick={handleStart}
            disabled={!canStart}
            selected={canStart}
            style={{
              width: "100%",
              maxWidth: 320,
              padding: "16px 24px",
              fontSize: 16,
              marginTop: 4,
            }}
          >
            ゲームスタート
          </OutlinedButton>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "12px 0",
          fontSize: 10,
          color: C.gray3,
          fontFamily: "'Inter', sans-serif",
          position: "relative",
          zIndex: 1,
        }}
      >
        Produced by algo
      </div>
    </ScreenWrapper>
  );
}

/* ─── Pass Screen ─── */
function PassScreen({ playerName, onReady, message = "に渡してください", subMessage = "準備ができたらボタンを押してください" }) {
  return (
    <ScreenWrapper>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: 32,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            border: `2px solid ${C.black}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          ▶
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.black,
            fontFamily: "'Noto Sans JP', sans-serif",
            textAlign: "center",
            margin: 0,
          }}
        >
          {playerName} {message}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: C.gray3,
            fontFamily: "'Noto Sans JP', sans-serif",
            textAlign: "center",
            margin: 0,
          }}
        >
          {subMessage}
        </p>
        <OutlinedButton
          onClick={onReady}
          selected={true}
          style={{
            padding: "16px 48px",
            fontSize: 16,
          }}
        >
          準備OK
        </OutlinedButton>
      </div>
    </ScreenWrapper>
  );
}

/* ─── Partner Toss Screen ─── */
function PartnerTossScreen({ partnerName, hand, onToss }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  return (
    <ScreenWrapper showGeo={true}>
      <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", flex: 1 }}>
        <h2 style={{ fontSize: 20, margin: "0 0 8px", fontWeight: 800, fontFamily: "'Noto Sans JP', sans-serif" }}>
          {partnerName} さん
        </h2>
        <p style={{ fontSize: 13, color: C.gray4, marginBottom: 24, fontWeight: 600 }}>
          手札から1枚選んでパートナーに見せましょう<br/>
          （裏向きのカードのみ選択可能）
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 32 }}>
          {hand.map((card, idx) => (
            <Card
              key={card.id}
              card={card}
              size="lg"
              isOwn={true}
              showNumber={true}
              isSelectable={!card.revealed}
              isSelected={selectedIdx === idx}
              onClick={() => {
                if (!card.revealed) setSelectedIdx(idx);
              }}
            />
          ))}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
          {selectedIdx !== null ? (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gray4, marginBottom: 8 }}>見せるカード</div>
              <Card card={hand[selectedIdx]} size="xl" showNumber={true} />
            </div>
          ) : (
            <div style={{ height: 110, marginBottom: 32 }} /> // placeholder
          )}

          <OutlinedButton
            onClick={() => onToss(selectedIdx)}
            selected={selectedIdx !== null}
            disabled={selectedIdx === null}
          >
            このカードを見せる
          </OutlinedButton>
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ─── Rules Overlay ─── */
function RulesOverlay({ onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.3s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.white,
          border: `2px solid ${C.black}`,
          padding: "24px 28px",
          maxWidth: 360,
          width: "90%",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "'Noto Sans JP', sans-serif",
            color: C.black,
            margin: "0 0 16px",
            textAlign: "center",
          }}
        >
          ルール確認
        </h3>
        <div
          style={{
            fontSize: 13,
            color: C.gray4,
            fontFamily: "'Noto Sans JP', sans-serif",
            lineHeight: 1.9,
          }}
        >
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>カード</p>
          <p style={{ margin: "0 0 12px" }}>
            黒カード（0〜11）と白カード（0〜11）の計24枚。
            手札は数字の小さい順に並べ、同じ数字なら黒が左。
          </p>
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>ターンの流れ</p>
          <p style={{ margin: "0 0 12px" }}>
            1. 山札から1枚引く（自分だけ見れる）<br />
            2. 相手の伏せカードを1枚選ぶ<br />
            3. 数字を宣言（アタック）
          </p>
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>正解 / 不正解</p>
          <p style={{ margin: "0 0 12px" }}>
            正解 → 相手のカードがオープン。再アタックかステイを選択。<br />
            不正解 → 引いたカードを公開してターン終了。
          </p>
          <p style={{ fontWeight: 700, margin: "0 0 8px" }}>勝利条件</p>
          <p style={{ margin: 0 }}>
            相手の手札を全てオープンさせたプレイヤーの勝ち。
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            display: "block",
            margin: "20px auto 0",
            padding: "10px 32px",
            border: `2px solid ${C.black}`,
            background: C.black,
            color: C.white,
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Noto Sans JP', sans-serif",
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

/* ─── Game Screen ─── */
function GameScreen({ gameState, onGameStateChange, onGameEnd, onHome, playerNames, cpuSettings }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedOwnCard, setSelectedOwnCard] = useState(null);
  const [guessNumber, setGuessNumber] = useState(null);
  const [showPassScreen, setShowPassScreen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const state = gameState;
  const currentPlayer = state.currentPlayer;
  const cardSize = getCardSize(playerNames.length);

  const cpuKnowledgeRefs = useRef({});

  useEffect(() => {
    if (state.mode === "individual" && (!cpuSettings || !state.players[currentPlayer].isCpu)) {
      setShowPassScreen(true);
    }
    setSelectedTarget(null);
    setSelectedOwnCard(null);
    setGuessNumber(null);
  }, [currentPlayer, state.mode, cpuSettings, state.players]);

  useEffect(() => {
    setSelectedTarget(null);
    setSelectedOwnCard(null);
    setGuessNumber(null);
  }, [state.phase]);

  // Watch for wrong guesses to inform HARD CPU
  useEffect(() => {
    if (state.lastAction?.type === "incorrect" && cpuSettings?.level === "hard") {
      const { targetPlayerIndex, targetCardIndex, guessNumber } = state.lastAction;
      if (guessNumber !== undefined) {
         Object.values(cpuKnowledgeRefs.current).forEach(knowledge => {
            knowledge.onWrongGuess(targetPlayerIndex, targetCardIndex, guessNumber);
         });
      }
    }
  }, [state.lastAction, cpuSettings]);

  // CPU Turn Execution
  useEffect(() => {
    if (!cpuSettings || state.phase === "gameover") return;
    const curPlayer = state.players[currentPlayer];
    if (!curPlayer.isCpu) return;

    if (state.phase === "continue") {
      setIsThinking(true);
      const timer = setTimeout(() => {
        setIsThinking(false);
        // Simple 50% chance to re-attack for easy
        if (Math.random() > 0.5) handleContinue();
        else handleStay();
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (state.phase !== "draw" && state.phase !== "pass_to_partner") return;

    if (!cpuKnowledgeRefs.current[curPlayer.id]) {
      cpuKnowledgeRefs.current[curPlayer.id] = new CpuKnowledge(state.players, curPlayer.id, cpuSettings.level);
    }
    const knowledge = cpuKnowledgeRefs.current[curPlayer.id];

    let isUnmounted = false;

    runCpuTurn(state, curPlayer.id, knowledge, cpuSettings.level, state.mode, {
      setThinking: (t) => { if (!isUnmounted) setIsThinking(t); },
      onAction: async (action) => {
        if (isUnmounted) return;
        if (state.mode === "pair") {
          const newState = pairAttack(state, action.targetPlayerIndex, action.targetCardIndex, action.myCardIndex);
          onGameStateChange(newState);
          if (newState.phase === "gameover") setTimeout(() => onGameEnd(newState), 800);
          return newState.lastAction?.type === "correct";
        } else {
          const newState = attack(state, action.targetPlayerIndex, action.targetCardIndex, action.guessNumber);
          onGameStateChange(newState);
          if (newState.phase === "gameover") setTimeout(() => onGameEnd(newState), 800);
          return newState.lastAction?.type === "correct";
        }
      },
      onToss: (tossInfo) => {
        if (isUnmounted) return;
        if (tossInfo.waitForConfirm) {
          const newState = partnerToss(state, tossInfo.tossedCardInfo.cardIndex);
          onGameStateChange(newState);
        }
      },
      waitForConfirm: () => new Promise(res => setTimeout(res, 800)),
    });

    return () => { isUnmounted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, state.phase]);

  if (state.phase === "gameover") {
    return null;
  }

  if (showPassScreen && state.mode === "individual") {
    return (
      <PassScreen
        playerName={state.players[currentPlayer].name}
        onReady={() => setShowPassScreen(false)}
      />
    );
  }

  // Pair mode extra phases
  if (state.mode === "pair") {
    if (state.phase === "pass_to_partner") {
      const partnerIdx = getPartnerIndex(state.players.length, currentPlayer);
      const partnerName = state.players[partnerIdx].name;
      return (
        <PassScreen
          playerName={partnerName}
          message="さんに渡してください"
          subMessage="トスをしてもらいます"
          onReady={() => onGameStateChange({ ...state, phase: "partner_toss" })}
        />
      );
    }

    if (state.phase === "partner_toss") {
      const partnerIdx = getPartnerIndex(state.players.length, currentPlayer);
      const partner = state.players[partnerIdx];
      return (
        <PartnerTossScreen
          partnerName={partner.name}
          hand={partner.hand}
          onToss={(cardIdx) => {
            const newState = partnerToss(state, cardIdx);
            onGameStateChange(newState);
          }}
        />
      );
    }

    if (state.phase === "pass_back") {
      const currentName = state.players[currentPlayer].name;
      return (
        <PassScreen
          playerName={currentName}
          message="さんに戻してください"
          subMessage="攻撃を開始します"
          onReady={() => {
            const newState = startAttackFromToss(state);
            onGameStateChange(newState);
          }}
        />
      );
    }
  }

  const handleDraw = () => {
    const newState = drawCard(state);
    onGameStateChange(newState);
  };

  const handleCardClick = (playerId, cardIdx, isOwnGroup) => {
    if (isOwnGroup) {
      setSelectedOwnCard(cardIdx);
    } else {
      setSelectedTarget({ player: playerId, card: cardIdx });
      setGuessNumber(null);
    }
  };

  const handleAttack = () => {
    if (state.mode === "pair") {
      if (!selectedTarget || selectedOwnCard === null) return;
      const newState = pairAttack(state, selectedTarget.player, selectedTarget.card, selectedOwnCard);
      setSelectedTarget(null);
      setSelectedOwnCard(null);
      onGameStateChange(newState);
      if (newState.phase === "gameover") {
        setTimeout(() => onGameEnd(newState), 800);
      }
    } else {
      if (!selectedTarget || guessNumber === null) return;
      const newState = attack(
        state,
        selectedTarget.player,
        selectedTarget.card,
        guessNumber
      );
      setSelectedTarget(null);
      setGuessNumber(null);
      onGameStateChange(newState);
  
      if (newState.phase === "gameover") {
        setTimeout(() => onGameEnd(newState), 800);
      }
    }
  };

  const handleStay = () => {
    const newState = state.mode === "pair" ? pairStayAction(state) : stayAction(state);
    onGameStateChange(newState);
  };

  const handleContinue = () => {
    const newState = state.mode === "pair" ? pairContinueAction(state) : continueAction(state);
    onGameStateChange(newState);
  };

  return (
    <ScreenWrapper showGeo={false}>
      {showRules && <RulesOverlay onClose={() => setShowRules(false)} />}

      {/* Home confirm dialog */}
      {showHomeConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.3s ease",
          }}
          onClick={() => setShowHomeConfirm(false)}
        >
          <div
            style={{
              background: C.white,
              border: `2px solid ${C.black}`,
              padding: "24px 28px",
              maxWidth: 300,
              width: "90%",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.black,
                fontFamily: "'Noto Sans JP', sans-serif",
                margin: "0 0 20px",
              }}
            >
              ゲームを中断してホームに戻りますか？
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                onClick={onHome}
                style={{
                  padding: "10px 24px",
                  border: `2px solid ${C.black}`,
                  background: C.black,
                  color: C.white,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Noto Sans JP', sans-serif",
                  cursor: "pointer",
                  borderRadius: 0,
                }}
              >
                はい
              </button>
              <button
                onClick={() => setShowHomeConfirm(false)}
                style={{
                  padding: "10px 24px",
                  border: `2px solid ${C.black}`,
                  background: C.white,
                  color: C.black,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Noto Sans JP', sans-serif",
                  cursor: "pointer",
                  borderRadius: 0,
                }}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        style={{
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `2px solid ${C.black}`,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "'Inter', sans-serif",
            color: C.black,
          }}
        >
          algosi<span style={{ fontStyle: "italic" }}>X</span>
        </span>
        <span
          style={{
            fontSize: 12,
            color: C.gray4,
            fontFamily: "'Noto Sans JP', sans-serif",
            fontWeight: 600,
          }}
        >
          ターン {state.turnCount + 1}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowRules(true)}
            style={{
              padding: "4px 10px",
              border: `1.5px solid ${C.gray2}`,
              background: C.white,
              color: C.gray4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Noto Sans JP', sans-serif",
              borderRadius: 0,
            }}
          >
            ルール
          </button>
          <button
            onClick={() => setShowHomeConfirm(true)}
            style={{
              padding: "4px 10px",
              border: `1.5px solid ${C.gray2}`,
              background: C.white,
              color: C.gray4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Noto Sans JP', sans-serif",
              borderRadius: 0,
            }}
          >
            ホーム
          </button>
        </div>
      </div>

      {/* Game board */}
      <GameBoard
        state={state}
        currentViewPlayer={currentPlayer}
        cardSize={cardSize}
        onCardClick={handleCardClick}
        selectedTarget={selectedTarget}
        selectedOwnCard={selectedOwnCard}
      />

      {/* Log */}
      <GameLog log={state.log} />

      {/* Action panel */}
      <div
        style={{
          padding: "0 16px 12px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {isThinking && (
          <div style={{
            position: "absolute",
            top: 60,
            background: C.black,
            color: C.white,
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 10,
            fontFamily: "'Noto Sans JP', sans-serif"
          }}>
            {state.players[currentPlayer].name} が考え中...
          </div>
        )}
        <ActionPanel
          phase={state.phase}
          mode={state.mode}
          drawnCard={state.drawnCard}
          tossedCard={state.tossedCard}
          selectedTarget={selectedTarget}
          selectedOwnCard={selectedOwnCard}
          guessNumber={guessNumber}
          onDraw={handleDraw}
          onAttack={handleAttack}
          onStay={handleStay}
          onContinue={handleContinue}
          onGuessChange={setGuessNumber}
          currentPlayerName={state.players[currentPlayer].name}
          lastAction={state.lastAction}
          disabled={isThinking}
        />
      </div>
    </ScreenWrapper>
  );
}

/* ─── Result Screen ─── */
function ResultScreen({ winner, onBackToMenu }) {
  return (
    <ScreenWrapper>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 32,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            border: `3px solid ${C.black}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          WINNER
        </div>
        <h2
          style={{
            fontSize: 30,
            fontWeight: 900,
            color: C.black,
            fontFamily: "'Noto Sans JP', sans-serif",
            margin: 0,
            textAlign: "center",
          }}
        >
          {winner} の勝利！
        </h2>
        <p
          style={{
            fontSize: 14,
            color: C.gray3,
            fontFamily: "'Noto Sans JP', sans-serif",
          }}
        >
           おめでとうございます
        </p>
        <OutlinedButton
          onClick={onBackToMenu}
          selected={true}
          style={{
            padding: "14px 40px",
            fontSize: 15,
            marginTop: 8,
          }}
        >
          メニューに戻る
        </OutlinedButton>
      </div>
    </ScreenWrapper>
  );
}

/* ─── Main AlgoApp ─── */
export default function AlgoApp() {
  const [screen, setScreen] = useState("menu");
  const [isCpuSetup, setIsCpuSetup] = useState(false);
  const [playerNames, setPlayerNames] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [winner, setWinner] = useState(null);
  const [cpuSettings, setCpuSettings] = useState(null);

  const handleStartGame = useCallback((names, mode, cpuOpts) => {
    setPlayerNames(names);
    if (cpuOpts) {
      setCpuSettings(cpuOpts);
      setGameState(initGame(names, mode, cpuOpts.cpuConfig));
    } else {
      setCpuSettings(null);
      setGameState(initGame(names, mode));
    }
    setScreen("game");
  }, []);

  const handleGameEnd = useCallback((finalState) => {
    setWinner(finalState.players[finalState.winner].name);
    setScreen("result");
  }, []);

  const handleBackToMenu = useCallback(() => {
    setScreen("menu");
    setGameState(null);
    setWinner(null);
    setPlayerNames([]);
  }, []);

  switch (screen) {
    case "menu":
      return <MenuScreen onNavigate={(target) => {
        if (target === "setup_cpu") {
          setIsCpuSetup(true);
          setScreen("setup");
        } else if (target === "setup") {
          setIsCpuSetup(false);
          setScreen("setup");
        } else {
          setScreen(target);
        }
      }} />;
    case "tutorial":
      return <Tutorial onComplete={handleBackToMenu} />;
    case "setup":
      return (
        <SetupScreen isCpuMode={isCpuSetup} onStart={handleStartGame} onBack={handleBackToMenu} />
      );
    case "game":
      return (
        <GameScreen
          gameState={gameState}
          onGameStateChange={setGameState}
          onGameEnd={handleGameEnd}
          onHome={handleBackToMenu}
          playerNames={playerNames}
          cpuSettings={cpuSettings}
        />
      );
    case "result":
      return (
        <ResultScreen winner={winner} onBackToMenu={handleBackToMenu} />
      );
    default:
      return <MenuScreen onNavigate={setScreen} />;
  }
}
