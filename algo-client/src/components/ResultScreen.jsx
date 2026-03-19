import React, { useState, useEffect } from "react";
import { Card } from "./GameUI";
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

/* ─── Result Screen ─── */
export default function ResultScreen({ state, onBackToMenu, onlineContext }) {
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

  if (!state || state.winner === undefined) return null;
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
            width: 120,
            height: 120,
            border: "4px solid var(--black)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 900,
            fontFamily: "'Inter', sans-serif",
            borderRadius: "50%",
            background: "var(--white)",
            color: "var(--black)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            position: "relative"
          }}
        >
          <span style={{ position: "absolute", top: -20, fontSize: 32 }}></span>
          WIN
        </div>
        <h2
          className="win-name"
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "var(--black)",
            fontFamily: "'Inter', sans-serif",
            margin: "0 0 8px",
            textAlign: "center",
            letterSpacing: "-0.02em"
          }}
        >
          {winnerPlayer.name}
        </h2>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray4)", marginBottom: 12 }}>HAS WON THE GAME</div>

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
