"use client";
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  GameBoard,
  ActionPanel,
  GameLog,
  Card,
} from "./GameUI";
import Tutorial from "./Tutorial";
import { CpuKnowledge, shouldReattack, cpuSelectToss, cpuDecide } from "../lib/cpuAI";
import { useFirebaseMultiplayer } from "../hooks/useFirebaseMultiplayer";
import { triggerCardAnim } from "../lib/animUtils";
import { OnlineSetupScreen, OnlineJoinScreen } from "./OnlineLobbyScreen";
import { OnlineRoomScreen } from "./OnlineRoomScreen";
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

import { GeometricBG, ScreenWrapper, OutlinedButton } from "./UXComponents";
import { STAMPS } from "../lib/stamps";

function ThinkingDots() {
  return (
    <span style={{ display:"flex", gap:3, alignItems:"center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          display:"inline-block", width:4, height:4, borderRadius:"50%",
          background:"var(--gray3)",
          animation:`dotPulse 1.1s ease-in-out ${i*.18}s infinite`,
        }}/>
      ))}
    </span>
  );
}

function ThinkingIndicator({ name, phase }) {
  const msg = {
    draw:     `${name} がカードを引いています`,
    attack:   `${name} が考えています`,
    continue: `${name} が考えています`,
  }[phase] ?? `${name} のターン`;

  return (
    <span style={{ display:"flex", alignItems:"center", gap:6 }}>
      <ThinkingDots/>
      <span style={{ fontSize:12, fontWeight:600, color:"var(--gray4)", whiteSpace: "nowrap" }}>{msg}</span>
    </span>
  );
}

function ConnStatus({ game }) {
  if (!game) return null;
  const allOk = game.players.every(p => p.connected !== false);
  const anyDc = game.players.some(p => p.connected === false);
  const color  = anyDc ? "#e03030" : allOk ? "#28a028" : "#e8b84b";
  const label  = anyDc ? "切断者あり" : allOk ? "全員接続中" : "接続不安定";
  return (
    <span title={label} style={{
      width:8, height:8, borderRadius:"50%", background:color,
      display:"inline-block", flexShrink:0,
      boxShadow:`0 0 0 2px ${color}33`, transition:"background .4s",
    }}/>
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
            ALGOSIX
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
              onClick={() => onNavigate("online_setup")}
              style={{ flex: 1, padding: "14px 12px", fontSize: 13 }}
            >
              オンライン戦
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>（作成）</span>
            </OutlinedButton>
            <OutlinedButton
              onClick={() => onNavigate("online_join")}
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
            Produced by ALGOSIX
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
          className="pass-ring"
          style={{
            width: 80,
            height: 80,
            border: `2px solid ${C.black}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            borderRadius: "50%",
          }}
        >
          ▶
        </div>
        <h2
          className="pass-name"
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
function PartnerTossScreen({ partnerName, hand, onToss, players, currentPlayer }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  // Build a list of other players to show their card arrangements
  const otherPlayers = players ? players.filter((_, i) => i !== (currentPlayer != null ? getPartnerIndex(players.length, currentPlayer) : -1)) : [];

  return (
    <ScreenWrapper showGeo={true}>
      <div style={{ padding: 24, textAlign: "center", display: "flex", flexDirection: "column", flex: 1, overflow: "auto" }}>
        <h2 style={{ fontSize: 20, margin: "0 0 8px", fontWeight: 800, fontFamily: "'Noto Sans JP', sans-serif" }}>
          {partnerName} さん
        </h2>
        <p style={{ fontSize: 13, color: C.gray4, marginBottom: 16, fontWeight: 600 }}>
          手札から1枚選んでパートナーに見せましょう<br/>
          （裏向きのカードのみ選択可能）
        </p>

        {/* Show other players' card arrangements */}
        {otherPlayers.length > 0 && (
          <div style={{ marginBottom: 16, padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: C.gray4, fontWeight: 700, marginBottom: 8 }}>他のプレイヤーのカード配置</div>
            {otherPlayers.map(p => (
              <div key={p.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.black, marginBottom: 4 }}>{p.name}</div>
                <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                  {p.hand.map((card) => (
                    <Card key={card.id} card={card} size="sm" isOwn={false} showNumber={card.revealed} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 24 }}>
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
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.gray4, marginBottom: 8 }}>見せるカード</div>
              <Card card={hand[selectedIdx]} size="xl" showNumber={true} />
            </div>
          ) : (
            <div style={{ height: 90, marginBottom: 24 }} />
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
function GameScreen({ gameState, onGameStateChange, onGameEnd, onHome, playerNames, cpuSettings, onlineContext }) {
  const { isHost, roomId, socket, emit, on, off, onlinePlayers } = onlineContext || {};
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedOwnCard, setSelectedOwnCard] = useState(null);
  const [guessNumber, setGuessNumber] = useState(null);
  const [showPassScreen, setShowPassScreen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [stampCooldown, setStampCooldown] = useState(false);

  const sendStamp = (stampId) => {
    if (stampCooldown || !onlineContext) return;
    onlineContext.emit("send_stamp", { roomId: onlineContext.roomId, stampId });
    setStampCooldown(true);
    setTimeout(() => setStampCooldown(false), 3000);
  };

  // Animation States
  const [cardAnims, setCardAnims] = useState({});
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [turnPulse, setTurnPulse] = useState(false);

  const state = gameState;
  const currentPlayer = state.currentPlayer;
  
  const isOnlinePeer = onlineContext && onlineContext.roomId && !onlineContext.isHost;
  const currentViewPlayer = isOnlinePeer 
    ? state.players.findIndex(p => p.name === onlineContext.onlinePlayers.find(op => op.id === "self")?.name) 
    : currentPlayer;
    
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

  // Handle Turn Pulse
  useEffect(() => {
    // Current player's turn started (in draw or pass_to_partner phase)
    if (state.currentPlayer === currentViewPlayer && 
        (state.phase === "draw" || state.phase === "pass_to_partner")) {
      setTurnPulse(true);
      setTimeout(() => setTurnPulse(false), 700);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([20]);
    }
  }, [state.currentPlayer, state.phase]);

  // Handle Action Animations (Flip, Shake, Combo)
  useEffect(() => {
    if (!state.lastAction) return;
    const la = state.lastAction;
    
    if (la.type === "correct") {
      setComboCount(prev => {
        const nextCombo = prev + 1;
        if (nextCombo >= 2) {
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 1300);
        }
        return nextCombo;
      });
      if (la.targetPlayerIndex !== undefined && la.targetCardIndex !== undefined) {
        triggerCardAnim(setCardAnims, `${la.targetPlayerIndex}-${la.targetCardIndex}`, "flip-reveal", 600);
      }
    } else if (la.type === "incorrect") {
      setComboCount(0);
      if (la.targetPlayerIndex !== undefined && la.targetCardIndex !== undefined) {
        triggerCardAnim(setCardAnims, `${la.targetPlayerIndex}-${la.targetCardIndex}`, "shake", 500);
      }
    } else if (la.type === "stay") {
      setComboCount(0);
    }
  }, [state.lastAction]);

  // --- ONLINE STATE SYNC LOGIC ---

  // Host: Broadcast masked state to peers whenever state changes
  useEffect(() => {
    if (!onlineContext || !isHost || !state) return;

    onlinePlayers.forEach(p => {
      if (p.isHost) return; // Skip self
      
      const pIndex = state.players.findIndex(sp => sp.name === p.name);
      const maskedState = JSON.parse(JSON.stringify(state)); // Deep clone
      
      maskedState.players.forEach((sp, i) => {
        if (i !== pIndex) {
          sp.hand.forEach(c => {
            if (!c.isRevealed) {
              c.number = null; // hide number to prevent cheat
            }
          });
        }
      });
      emit("host_sync_state", { roomId, targetId: p.id, state: maskedState });
    });
  }, [state, isHost, onlineContext, onlinePlayers, emit, roomId]);

  // Peer: Receive state updates from host
  useEffect(() => {
    if (!onlineContext || isHost) return;
    
    const handleSync = (newState) => {
      onGameStateChange(newState);
      if (newState.phase === "gameover") {
         setTimeout(() => onGameEnd(newState), 800);
      }
    };
    on("sync_state", handleSync);
    return () => off("sync_state", handleSync);
  }, [onlineContext, isHost, on, off, onGameStateChange, onGameEnd]);

  // --- ACTION DISPATCHER ---
  const dispatchAction = useCallback((actionType, payload) => {
    if (onlineContext && onlineContext.roomId && !isHost) {
      // Peer sends action to host instead of executing it locally
      emit("peer_action", { roomId, action: actionType, payload });
      return;
    }
    
    // Local / Host processing
    onGameStateChange(prevState => {
      if (!prevState) return prevState;
      let newState = prevState;
      switch (actionType) {
        case "draw": 
          newState = drawCard(prevState); 
          break;
        case "attack":
          newState = attack(prevState, payload.targetPlayer, payload.targetCard, payload.guessNumber);
          break;
        case "pairAttack":
          newState = pairAttack(prevState, payload.targetPlayer, payload.targetCard, payload.ownCard, payload.guessNumber);
          break;
        case "stay":
          newState = prevState.mode === "pair" ? pairStayAction(prevState) : stayAction(prevState);
          break;
        case "continue":
          newState = prevState.mode === "pair" ? pairContinueAction(prevState) : continueAction(prevState);
          break;
        case "toss":
          newState = partnerToss(prevState, payload.cardIdx);
          break;
        case "startAttack":
          newState = startAttackFromToss(prevState);
          break;
      }
      
      if (newState.phase === "gameover") {
         setTimeout(() => onGameEnd(newState), 800);
      }
      return newState;
    });
  }, [onlineContext, isHost, emit, roomId, onGameStateChange, onGameEnd]);

  // Host: Listen for peer actions and dispatch them
  useEffect(() => {
    if (!onlineContext || !isHost) return;
    const handlePeerAction = (data) => {
      dispatchAction(data.action, data.payload);
    };
    on("peer_action", handlePeerAction);
    return () => off("peer_action", handlePeerAction);
  }, [onlineContext, isHost, on, off, dispatchAction]);

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

    let isUnmounted = false;
    const curPlayer = state.players[currentPlayer];
    const partnerIdx = getPartnerIndex(state.players.length, currentPlayer);
    const partner = partnerIdx !== null ? state.players[partnerIdx] : null;

    const getKnowledge = (pId) => {
      if (!cpuKnowledgeRefs.current[pId]) {
        cpuKnowledgeRefs.current[pId] = new CpuKnowledge(state.players, pId, cpuSettings.level);
      }
      const k = cpuKnowledgeRefs.current[pId];
      k.updateFromState(state);
      return k;
    };

    // 1. CPU decides stay or continue
    if (state.phase === "continue" && curPlayer.isCpu) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        if (isUnmounted) return;
        setIsThinking(false);
        const k = getKnowledge(curPlayer.id);
        if (shouldReattack(cpuSettings.level, k, state, curPlayer.id)) {
           handleContinue();
        } else {
           handleStay();
        }
      }, 1000);
      return () => { isUnmounted = true; clearTimeout(timer); };
    }

    // 2. CPU partner tosses card
    if (state.phase === "pass_to_partner" && partner?.isCpu) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        if (isUnmounted) return;
        setIsThinking(false);
        const k = getKnowledge(partner.id);
        const tossedCardIdx = cpuSelectToss(cpuSettings.level, state, partner.id, curPlayer.id, k);
        dispatchAction("toss", { cardIdx: tossedCardIdx });
      }, 1000);
      return () => { isUnmounted = true; clearTimeout(timer); };
    }

    // 3. Skip "pass_back" screen if current player is CPU
    if (state.phase === "pass_back" && curPlayer.isCpu) {
       dispatchAction("startAttack");
       return;
    }

    // 4. CPU Draws
    if (state.phase === "draw" && curPlayer.isCpu) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        if (isUnmounted) return;
        setIsThinking(false);
        handleDraw();
      }, 800);
      return () => { isUnmounted = true; clearTimeout(timer); };
    }

    // 5. CPU Attacks
    if (state.phase === "attack" && curPlayer.isCpu) {
      setIsThinking(true);
      const timer = setTimeout(() => {
        if (isUnmounted) return;
        setIsThinking(false);
        const k = getKnowledge(curPlayer.id);
        const action = cpuDecide(cpuSettings.level, state, curPlayer.id, k, state.mode);
        if (!action) { handleStay(); return; }
        
        let dispatched = false;
        if (state.mode === "pair") {
          dispatchAction("pairAttack", { 
            targetPlayer: action.targetPlayerIndex, 
            targetCard: action.targetCardIndex, 
            ownCard: action.myCardIndex, 
            guessNumber: action.guessNumber 
          });
        } else {
          dispatchAction("attack", { 
            targetPlayer: action.targetPlayerIndex, 
            targetCard: action.targetCardIndex, 
            guessNumber: action.guessNumber 
          });
        }
      }, 1500);
      return () => { isUnmounted = true; clearTimeout(timer); };
    }

    return () => { isUnmounted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, state.phase, state.tossedCard]);

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

  // Pair mode extra phases (skip screens for CPU players)
  if (state.mode === "pair") {
    const partnerIdx = getPartnerIndex(state.players.length, currentPlayer);
    const partner = state.players[partnerIdx];

    if (state.phase === "pass_to_partner") {
      // If partner is CPU, don't show pass screen — let useEffect handle auto-toss
      if (!partner?.isCpu) {
        const partnerName = partner.name;
        return (
          <PassScreen
            playerName={partnerName}
            message="さんに渡してください"
            subMessage="トスをしてもらいます"
            onReady={() => onGameStateChange({ ...state, phase: "partner_toss" })}
          />
        );
      }
      // CPU partner: show thinking indicator on the game board (falls through to game board render)
    }

    if (state.phase === "partner_toss") {
      // This phase is only reached when partner is human
      return (
        <PartnerTossScreen
          partnerName={partner.name}
          hand={partner.hand}
          players={state.players}
          currentPlayer={currentPlayer}
          onToss={(cardIdx) => {
            const newState = partnerToss(state, cardIdx);
            onGameStateChange(newState);
          }}
        />
      );
    }

    if (state.phase === "pass_back") {
      // If current player is CPU, skip pass_back screen (useEffect handles it)
      if (!state.players[currentPlayer].isCpu) {
        const currentName = state.players[currentPlayer].name;
        return (
          <PassScreen
            playerName={currentName}
            message="さんに戻してください"
            subMessage="攻撃を開始します"
          onReady={() => dispatchAction("startAttack", {})}
          />
        );
      }
    }
  }

  const handleDraw = () => {
    dispatchAction("draw");
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
      if (!selectedTarget || selectedOwnCard === null || guessNumber === null) return;
      dispatchAction("pairAttack", { 
        targetPlayer: selectedTarget.player, 
        targetCard: selectedTarget.card, 
        ownCard: selectedOwnCard, 
        guessNumber: guessNumber 
      });
      setSelectedTarget(null);
      setSelectedOwnCard(null);
      setGuessNumber(null);
    } else {
      if (!selectedTarget || guessNumber === null) return;
      dispatchAction("attack", { 
        targetPlayer: selectedTarget.player, 
        targetCard: selectedTarget.card, 
        guessNumber: guessNumber 
      });
      setSelectedTarget(null);
      setGuessNumber(null);
    }
  };

  const handleStay = () => {
    dispatchAction("stay");
  };

  const handleContinue = () => {
    dispatchAction("continue");
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
          gap: 8,
          overflowX: "auto"
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 900,
            fontFamily: "'Inter', sans-serif",
            color: C.black,
            flexShrink: 0
          }}
        >
          algosi<span style={{ fontStyle: "italic" }}>X</span>
        </span>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minWidth: 100 }}>
          {state.currentPlayer === currentViewPlayer ? (
             <span style={{ fontSize: 13, fontWeight: 700, color: C.black }}>あなたのターン</span>
          ) : (
             <ThinkingIndicator name={state.players[currentPlayer].name} phase={state.phase}/>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
             <span style={{ fontSize: 11, fontWeight: 700, color: C.gray4, whiteSpace: "nowrap" }}>山札 {state.deck.length}</span>
             {onlineContext?.roomId && <ConnStatus game={state} />}
          </div>
          <button
            onClick={() => setShowRules(true)}
            style={{
              padding: "4px 8px",
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
              padding: "4px 8px",
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
        currentViewPlayer={currentViewPlayer}
        cardSize={cardSize}
        onCardClick={handleCardClick}
        selectedTarget={selectedTarget}
        selectedOwnCard={selectedOwnCard}
        cardAnims={cardAnims}
        turnPulse={turnPulse}
        showCombo={showCombo}
        comboCount={comboCount}
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

      {/* Lobby Stamp Bar */}
      {onlineContext && onlineContext.roomId && (
        <div className="stamp-bar" style={{ background: "var(--white)", width: "100%", paddingBottom: 16 }}>
          {STAMPS.map(s => (
            <button key={s.id} disabled={stampCooldown} onClick={() => sendStamp(s.id)} className={`stamp-btn${stampCooldown ? " cooling" : ""}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Disconnect Overlay */}
      {onlineContext && state.players.some(p => p.connected === false) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(255,255,255,0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 20, padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>プレイヤーの一人が切断されました</div>
          <div style={{ fontSize: 13, color: "var(--gray4)" }}>
            再接続を待機しています...
          </div>
          <button style={{ padding: "10px 24px", border: `2px solid ${C.black}`, background: C.white, color: C.black, fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={onHome}>
            ホームに戻る
          </button>
        </div>
      )}

    </ScreenWrapper>
  );
}

/* ─── Result Screen ─── */
function ResultScreen({ state, onBackToMenu, onlineContext }) {
  const [revealedAll, setRevealedAll] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [votedCount, setVotedCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!onlineContext) return;
    const handleRematch = (data) => setVotedCount(data.count);
    onlineContext.on("rematch_update", handleRematch);
    return () => onlineContext.off("rematch_update", handleRematch);
  }, [onlineContext]);

  useEffect(() => {
    if (onlineContext && onlineContext.onlinePlayers?.length > 0 && votedCount >= onlineContext.onlinePlayers.length) {
      setTimeout(() => {
        if (onlineContext.isHost) onlineContext.emit("clear_rematch_votes", { roomId: onlineContext.roomId });
        onBackToMenu("online_room");
      }, 1000);
    }
  }, [votedCount, onlineContext, onBackToMenu]);

  useEffect(() => {
    // After 0.6s start flipping cards sequentially
    const timer1 = setTimeout(() => setRevealedAll(true), 600);
    // After 2.0s show summary
    const timer2 = setTimeout(() => setShowSummary(true), 2000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  const winnerPlayer = state.players[state.winner];

  // Calculate stats from log
  const totalTurns = state.log.filter(e => e.includes("カードを引いた")).length;
  const correctByPlayer = state.players.map(p => {
    const correct = state.log.filter(e => e.startsWith(p.name) && e.includes("正解")).length;
    const total = state.log.filter(e => e.startsWith(p.name) && (e.includes("正解") || e.includes("不正解"))).length;
    return { name: p.name, correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 };
  });

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
          overflowY: "auto"
        }}
      >
        <div
          className="win-badge"
          style={{
            width: 100,
            height: 100,
            border: `3px solid ${C.black}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            fontWeight: 900,
            fontFamily: "'Inter', sans-serif",
            borderRadius: "50%",
            background: C.black,
            color: C.white,
          }}
        >
          WINNER
        </div>
        <h2
          className="win-name"
          style={{
            fontSize: 30,
            fontWeight: 900,
            color: C.black,
            fontFamily: "'Noto Sans JP', sans-serif",
            margin: 0,
            textAlign: "center",
          }}
        >
          {winnerPlayer.name} の勝利！
        </h2>

        {/* Sequenced card reveals */}
        <div className="win-hands">
          {state.players.map((player, pi) => (
            <div key={pi} className="win-hand-row">
              <span className="win-hand-name">{player.name}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {player.hand.map((card, ci) => (
                  <div
                    key={ci}
                    style={{
                      animationDelay: revealedAll ? `${(pi * player.hand.length + ci) * 0.08}s` : "0s",
                    }}
                  >
                    <Card
                      card={{ ...card, revealed: true }}
                      size="sm"
                      showNumber={true}
                      animClass={revealedAll ? "flip-reveal" : ""}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Game Stats Summary */}
        {showSummary && (
          <div className="game-summary">
            <div className="summary-row">
              <span>総ターン数</span>
              <span>{Math.max(totalTurns, state.turnCount)}</span>
            </div>
            {correctByPlayer.map((p, i) => (
              <div key={i} className="summary-row">
                <span>{p.name} 正解率</span>
                <span>{p.rate}%</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ animation: "fadeIn 0.5s ease 2.5s both", marginTop: 12, display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
          {onlineContext && onlineContext.roomId && (
            <OutlinedButton
              onClick={() => {
                if (!hasVoted) {
                  setHasVoted(true);
                  onlineContext.emit("rematch_vote", { roomId: onlineContext.roomId });
                }
              }}
              selected={hasVoted}
              disabled={hasVoted}
              style={{ padding: "14px 20px", fontSize: 15, background: hasVoted ? C.black : C.white, color: hasVoted ? C.white : C.black }}
            >
              もう一度！ ({votedCount}/{onlineContext.onlinePlayers.length})
            </OutlinedButton>
          )}

          {onlineContext && onlineContext.isHost && state.mode === "pair" && (
            <OutlinedButton
              onClick={() => {
                onlineContext.emit("pair_change", { roomId: onlineContext.roomId });
                alert("ペアをシャッフルしました");
              }}
              style={{ padding: "14px 20px", fontSize: 15, borderStyle: "dashed" }}
            >
              ペア変更（ランダム）
            </OutlinedButton>
          )}

          <OutlinedButton
            onClick={() => onBackToMenu("menu")}
            selected={!onlineContext?.roomId}
            style={{ padding: "14px 20px", fontSize: 15 }}
          >
            メニューに戻る
          </OutlinedButton>
        </div>
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
  const [pendingCode, setPendingCode] = useState("");

  // Online Multiplayer State (Firebase Adaptive Hook)
  const { connected, socket, connect, disconnect, emit, on, off } = useFirebaseMultiplayer();
  const [onlineRoomId, setOnlineRoomId] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [onlineConfig, setOnlineConfig] = useState(null); // { playerCount, mode }

  // Automatically handle socket connection for room creation/joining
  useEffect(() => {
    const code = sessionStorage.getItem("pendingRoomCode");
    if (code) {
      sessionStorage.removeItem("pendingRoomCode");
      setPendingCode(code);
      setScreen("online_join");
    }
  }, []);

  useEffect(() => {
    on("room_created", (data) => {
      setOnlineRoomId(data.roomId);
      setScreen("online_room");
    });

    on("player_joined", (data) => {
      setOnlinePlayers(data.players);
      // If we joined successfully and we aren't already in the room screen (as a peer)
      if (screen === "online_join") {
        setScreen("online_room");
      }
    });

    on("error", (error) => {
      alert(error.message);
    });

    on("room_closed", (data) => {
      alert(data.message);
      setScreen("menu");
      setOnlineRoomId(null);
      setOnlinePlayers([]);
      setIsHost(false);
      disconnect();
    });

    on("player_left", (data) => {
      setOnlinePlayers(data.players);
    });

    return () => {
      off("room_created");
      off("player_joined");
      off("error");
      off("room_closed");
      off("player_left");
    };
  }, [on, off, screen, disconnect]);

  const handleCreateOnlineRoom = useCallback((config) => {
    connect();
    setIsHost(true);
    setOnlineConfig({ playerCount: config.playerCount, mode: config.mode });
    setOnlinePlayers([{ id: "self", name: config.name, isHost: true }]); // Optimistic UI
    
    // Slight delay to ensure connection is ready before emitting
    setTimeout(() => {
      emit("create_room", { name: config.name, maxPlayers: config.playerCount });
    }, 500);
  }, [connect, emit]);

  const handleJoinOnlineRoom = useCallback((data) => {
    connect();
    setIsHost(false);
    setOnlineRoomId(data.roomId);
    
    setTimeout(() => {
      emit("join_room", { roomId: data.roomId, name: data.name });
    }, 500);
  }, [connect, emit]);

  const handleLeaveOnlineRoom = useCallback(() => {
    disconnect();
    setOnlineRoomId(null);
    setOnlinePlayers([]);
    setIsHost(false);
    setScreen("menu");
  }, [disconnect]);

  const handleStartGame = useCallback((names, mode, cpuOpts) => {
    // Both Local and Online entry point? If online, names comes from onlinePlayers
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

  const handleOnlineHostStart = useCallback(() => {
    if (!isHost) return;
    const names = onlinePlayers.map(p => p.name);
    // TODO: if length < maxPlayers, fill with CPUs...
    // For now assume it requires full real players or host starts anyway
    // Wait, the onlineConfig has playerCount and mode.
    // If not full, we pad it with CPU names...
    
    let finalNames = [...names];
    let cpuOpts = undefined;
    
    if (finalNames.length < onlineConfig.playerCount) {
      const cpuCount = onlineConfig.playerCount - finalNames.length;
      const cpuConfig = {};
      for (let i = 0; i < cpuCount; i++) {
        const idx = finalNames.length;
        finalNames.push(`CPU ${i + 1}`);
        cpuConfig[idx] = true; // CPU
      }
      cpuOpts = { level: "normal", cpuConfig };
    }

    handleStartGame(finalNames, onlineConfig.mode, cpuOpts);

    // Initial sync of the generated game state will happen inside GameScreen when it mounts
  }, [isHost, onlinePlayers, onlineConfig, handleStartGame]);

  const handleGameEnd = useCallback((finalState) => {
    setGameState(finalState);
    setScreen("result");
  }, []);

  const handleBackToMenu = useCallback((targetScreen = "menu") => {
    // Determine screen carefully. Usually "menu", but "online_room" uses Lobby UI logic
    if (typeof targetScreen !== "string") targetScreen = "menu"; // ensure from event
    
    setScreen(targetScreen);
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
    case "online_setup":
      return <OnlineSetupScreen onCreate={handleCreateOnlineRoom} onBack={handleBackToMenu} />;
    case "online_join":
      return <OnlineJoinScreen onJoin={handleJoinOnlineRoom} onBack={handleBackToMenu} defaultRoomId={pendingCode} />;
    case "online_room":
      return (
        <OnlineRoomScreen 
          isHost={isHost} 
          roomId={onlineRoomId} 
          players={onlinePlayers} 
          maxPlayers={onlineConfig?.playerCount || 4}
          onStart={handleOnlineHostStart}
          onLeave={handleLeaveOnlineRoom}
          emit={emit}
          myId={socket?.id}
        />
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
          onlineContext={{ isHost, roomId: onlineRoomId, socket, emit, on, off, onlinePlayers }}
        />
      );
    case "result":
      return <ResultScreen state={gameState} onBackToMenu={handleBackToMenu} onlineContext={{ isHost, roomId: onlineRoomId, socket, emit, on, off, onlinePlayers }} />;
    default:
      return <MenuScreen onNavigate={setScreen} />;
  }
}
