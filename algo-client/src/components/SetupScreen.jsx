import React, { useState } from "react";
import { ScreenWrapper, OutlinedButton } from "./UXComponents";

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

/* ─── Setup Screen ─── */
export default function SetupScreen({ isCpuMode, onStart, onBack }) {
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
    // ペア戦が選択済みの状態で人数を変えた場合に備え、
    // ペア戦が有効になる人数に変えてもモードはユーザーに明示的に選ばせる
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
            ALGOSIX
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
        Produced by ALGOSIX
      </div>
    </ScreenWrapper>
  );
}
