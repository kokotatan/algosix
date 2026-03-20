"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";

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

const CARD_SIZES = {
  xl: { w: 58, h: 82, font: 32 },
  lg: { w: 50, h: 70, font: 27 },
  md: { w: 44, h: 62, font: 24 },
  sm: { w: 32, h: 46, font: 16 },
};

import { STAMPS } from "../lib/stamps";

function StampFloat({ stampData }) {
  const [activeStamp, setActiveStamp] = React.useState(null);

  React.useEffect(() => {
    if (stampData && stampData.ts) {
      const msSince = Date.now() - stampData.ts;
      if (msSince < 2500) {
        const stampDef = STAMPS.find(s => s.id === stampData.id);
        setActiveStamp({ key: stampData.ts, label: stampDef ? stampDef.label : "" });
        const timer = setTimeout(() => setActiveStamp(null), 2500 - msSince);
        return () => clearTimeout(timer);
      }
    }
  }, [stampData]);

  if (!activeStamp) return null;

  return (
    <div key={activeStamp.key} className="stamp-float" style={{ top: -38, zIndex: 10, borderRadius: 0 }}>
      {activeStamp.label}
    </div>
  );
}

/* ─── Card Component ─── */
export function Card({
  card,
  size = "xl",
  onClick,
  isSelectable = false,
  isSelected = false,
  isOwn = false,
  showNumber = false,
  isTossed = false,
  animClass = "",
}) {
  const dim = CARD_SIZES[size];
  const isRevealed = card.revealed || showNumber;
  const isBlack = card.color === "black";

  const baseStyle = {
    width: dim.w,
    height: dim.h,
    borderRadius: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 2px",
    cursor: isSelectable ? "pointer" : "default",
    position: "relative",
    transition: "transform 0.2s, box-shadow 0.2s",
    flexShrink: 0,
    fontFamily: "'Inter', sans-serif",
    fontSize: dim.font,
    fontWeight: 700,
    userSelect: "none",
  };

  // Face-up card
  if (isRevealed) {
    const tossColor = "#d97706"; // amber for toss cards
    const faceStyle = {
      ...baseStyle,
      background: isBlack ? C.black : C.white,
      color: isBlack ? C.white : C.black,
      border: isSelected
        ? `3px solid ${C.green}`
        : isTossed
        ? `2px dashed ${tossColor}`
        : `2px solid ${C.black}`,
      boxShadow: isSelected
        ? `0 0 8px ${C.green}66`
        : isTossed
        ? `0 0 8px ${tossColor}55, 0 2px 4px rgba(0,0,0,0.1)`
        : "0 2px 4px rgba(0,0,0,0.1)",
      transform: isSelected ? "translateY(-4px)" : "none",
    };

    return (
      <div
        className={`card${animClass ? ` ${animClass}` : ""}`}
        style={faceStyle}
        onClick={onClick}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
      >
        {card.number}
        {isTossed && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              fontSize: 8,
              background: tossColor,
              color: "#fff",
              padding: "2px 5px",
              borderRadius: "10px",
              fontWeight: 800,
              letterSpacing: 0.5,
              border: "1.5px solid #fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            TOSS
          </span>
        )}
        {isOwn && card.revealed && !isTossed && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              fontSize: 8,
              background: "var(--red)",
              color: "#fff",
              padding: "2px 5px",
              borderRadius: "10px",
              fontWeight: 800,
              letterSpacing: 0.5,
              border: "1.5px solid #fff",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            OPEN
          </span>
        )}
      </div>
    );
  }

  // Face-down card
  const backStyle = {
    ...baseStyle,
    background: isBlack
      ? `repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 4px, #252525 4px, #252525 8px)`
      : `repeating-linear-gradient(45deg, ${C.white}, ${C.white} 4px, ${C.gray1} 4px, ${C.gray1} 8px)`,
    border: isSelected
      ? `3px solid ${C.green}`
      : `2px solid ${C.black}`,
    boxShadow: isSelected
      ? `0 0 8px ${C.green}66`
      : "0 2px 4px rgba(0,0,0,0.1)",
    transform: isSelected ? "translateY(-4px)" : "none",
  };

  // Pip — square for black, circle for white
  const pipStyle = {
    width: 10,
    height: 10,
    borderRadius: 0,
    background: isBlack ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)",
  };

  return (
    <div
      className={`card${animClass ? ` ${animClass}` : ""}`}
      style={backStyle}
      onClick={onClick}
      role={isSelectable ? "button" : undefined}
      tabIndex={isSelectable ? 0 : undefined}
    >
      <div style={pipStyle} />
    </div>
  );
}

/* ─── Seat Component ─── */
export function Seat({
  player,
  isCurrentPlayer,
  cardSize,
  isOwnSeat,
  onCardClick,
  selectedCardIndex,
  selectedOwnCardIndex,
  ownCardSelecting = false, // brief lock after own card pick in pair mode
  phase,
  mode,
  team,
  myTeam,
  tossedCard, // new prop passed from GameBoard
  cardAnims = {},
}) {
  const seatStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "6px 8px",
    border: isCurrentPlayer ? `2px solid ${C.black}` : "2px solid transparent",
    background: isCurrentPlayer ? "rgba(0,0,0,0.03)" : "transparent",
    transition: "all 0.3s",
  };

  const nameStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: C.black,
    fontFamily: "'Noto Sans JP', sans-serif",
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cardsRow = {
    display: "flex",
    gap: 3,
    justifyContent: "center",
    flexWrap: "nowrap",
  };

  const isAttackTarget = phase === "attack" && (
    mode === "pair" ? team !== myTeam : !isOwnSeat
  );

  const isMyAttackCard = phase === "attack" && mode === "pair" && isOwnSeat;
  const isPartnerSeat = mode === "pair" && team === myTeam && !isOwnSeat;

  return (
    <div style={{ ...seatStyle, position: "relative" }}>
      <StampFloat stampData={player.lastStamp} />
      <div style={nameStyle}>
        {player.name}
        {mode === "pair" && team && (
          <span
            style={{
              display: "inline-block",
              marginLeft: 6,
              width: 8,
              height: 8,
              background: team === "A" ? C.red : C.green,
              borderRadius: 0,
            }}
          />
        )}
        {player.isOut && (
          <span style={{ color: C.red, marginLeft: 4, fontSize: 10 }}>
            OUT
          </span>
        )}
      </div>
      <div style={cardsRow}>
        {player.hand.map((card, idx) => {
          const isTossedCard = isPartnerSeat && tossedCard && tossedCard.cardIndex === idx;
          const displayCard = isTossedCard ? { ...card, revealed: true, number: tossedCard.number } : card;
          const showNumber = isOwnSeat || isTossedCard;

          const isTargetSelectable = isAttackTarget && !card.revealed;
          const isOwnSelectable = isMyAttackCard && !card.revealed;

          // Enforce picking own card first in pair mode; lock opponent cards briefly after own card picked
          const canSelectTarget = isTargetSelectable && (mode !== "pair" || (selectedOwnCardIndex !== null && !ownCardSelecting));
          const isSelectable = canSelectTarget || isOwnSelectable;

          const isSelected = 
            (isTargetSelectable && selectedCardIndex?.player === player.id && selectedCardIndex?.card === idx) ||
            (isOwnSelectable && selectedOwnCardIndex === idx);

          return (
            <Card
              key={card.id}
              card={displayCard}
              size={cardSize}
              isOwn={isOwnSeat}
              showNumber={showNumber}
              isSelectable={isSelectable}
              isSelected={isSelected}
              isTossed={isTossedCard}
              animClass={cardAnims[`${player.id}-${idx}`] || ""}
              onClick={() => {
                if (isSelectable && onCardClick) {
                  onCardClick(player.id, idx, isOwnSelectable);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ─── DeckStack Component ─── */
export function DeckStack({ count, drawnCard, showDrawn, animClass = "", showCombo = false, comboCount = 0 }) {
  const stackStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  };

  const deckVisual = {
    position: "relative",
    width: 48,
    height: 68,
  };

  const cardsInStack = Math.min(count, 3);

  return (
    <div style={stackStyle} className="center-pile position-relative">
      {showCombo && (
        <div className="combo-badge">
          {comboCount >= 4 ? "すごい！" : `${comboCount}連続！`}
        </div>
      )}
      <div style={deckVisual}>
        {Array.from({ length: cardsInStack }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: i * 2,
              left: i * 1,
              width: 46,
              height: 64,
              borderRadius: 0,
              background: `repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 3px, #282828 3px, #282828 6px)`,
              border: `2px solid ${C.black}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          />
        ))}
        {count === 0 && (
          <div
            style={{
              width: 46,
              height: 64,
              borderRadius: 0,
              border: `2px dashed ${C.gray3}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: C.gray3,
            }}
          >
            EMPTY
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: 11,
          color: C.gray4,
          fontFamily: "'Inter', sans-serif",
          fontWeight: 700,
        }}
      >
        {count}枚
      </span>
      {showDrawn && drawnCard && (
        <div style={{ marginTop: 4 }}>
          <Card card={drawnCard} size="lg" showNumber={true} animClass={animClass} />
        </div>
      )}
    </div>
  );
}

/* ─── Number Selector Component ─── */
export function NumberSelector({ value, onChange, disabled }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 3,
    maxWidth: 240,
  };

  return (
    <div style={gridStyle}>
      {Array.from({ length: 12 }, (_, i) => (
        <button
          key={i}
          disabled={disabled}
          onClick={() => !disabled && onChange(i)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 0,
            border: `2px solid ${value === i ? "var(--black)" : "var(--gray2)"}`,
            background: value === i ? "var(--black)" : "var(--white)",
            color: value === i ? "var(--white)" : "var(--black)",
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
            transform: value === i ? "scale(1.1)" : "none"
          }}
        >
          {i}
        </button>
      ))}
    </div>
  );
}

/* ─── ActionPanel Component ─── */
export function ActionPanel({
  phase,
  mode,
  drawnCard,
  tossedCard,
  selectedTarget,
  selectedOwnCard, // For pair mode
  ownCardSelecting = false,
  guessNumber,     // For individual mode
  onDraw,
  onAttack,
  onStay,
  onContinue,
  onCancel,
  onGuessChange,
  currentPlayerName,
  lastAction,
  disabled,
}) {
  const panelStyle = {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
    border: "2px solid var(--black)",
    borderRadius: 0,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: phase === "attack" ? 6 : 10, // Compact during attack
    width: "90%",
    maxWidth: 340,
    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
    zIndex: 110,
    padding: phase === "attack" ? "12px 16px" : "16px 20px",
  };

  const btnStyle = (filled = true, isDisabled = false) => {
    const finalDisabled = disabled || isDisabled;
    return {
      padding: "10px 24px",
      borderRadius: 0,
      border: `2px solid ${finalDisabled ? "var(--gray2)" : "var(--black)"}`,
      background: finalDisabled ? "var(--gray1)" : filled ? "var(--black)" : "var(--white)",
      color: finalDisabled ? "var(--gray3)" : filled ? "var(--white)" : "var(--black)",
      fontSize: 14,
      fontWeight: 800,
      fontFamily: "'Noto Sans JP', sans-serif",
      cursor: finalDisabled ? "not-allowed" : "pointer",
      transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
      minWidth: 140,
      boxShadow: filled && !finalDisabled ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
    };
  };

  const labelStyle = {
    fontSize: 13,
    color: C.gray4,
    fontFamily: "'Noto Sans JP', sans-serif",
    textAlign: "center",
    fontWeight: 600,
  };

  const feedbackColor =
    lastAction?.type === "correct"
      ? C.green
      : lastAction?.type === "incorrect"
      ? C.red
      : C.gray4;

  return (
    <div style={panelStyle}>
      {lastAction && (
        <div
          style={{
            fontSize: 12,
            color: feedbackColor,
            fontWeight: 700,
            textAlign: "center",
            padding: "4px 8px",
            border: `1px solid ${feedbackColor}33`,
          }}
        >
          {lastAction.detail}
        </div>
      )}

      {phase === "draw" && (
        <>
          <div style={labelStyle}>{currentPlayerName} のターン</div>
          <button style={btnStyle(true)} onClick={onDraw} disabled={disabled}>
            カードを引く
          </button>
        </>
      )}

      {phase === "attack" && mode !== "pair" && (
        <>
          <div style={labelStyle}>
            {drawnCard
              ? `引いたカード: ${drawnCard.color === "black" ? "黒" : "白"}${drawnCard.number}`
              : "アタック"}
          </div>
          <div style={labelStyle}>
            {selectedTarget
              ? "数字を選んでアタック！"
              : "相手の伏せカードをタップ"}
          </div>
          {selectedTarget && (
            <>
              <NumberSelector value={guessNumber} onChange={onGuessChange} disabled={disabled} />
              <button
                style={btnStyle(true, guessNumber === null)}
                onClick={onAttack}
                disabled={disabled || guessNumber === null}
              >
                アタック！
              </button>
              <button
                style={{ ...btnStyle(false), marginTop: -4 }}
                onClick={onCancel}
                disabled={disabled}
              >
                キャンセル
              </button>
            </>
          )}
        </>
      )}

      {phase === "attack" && mode === "pair" && (
        <>
          <div style={{ ...labelStyle, fontSize: 14, fontWeight: 800 }}>
            {tossedCard
              ? `トスで見たカード: ${tossedCard.color === "black" ? "黒" : "白"}${tossedCard.number}`
              : "アタックフェーズ"}
          </div>
          <div style={{ fontSize: 13, color: C.black, fontWeight: 600, textAlign: "center", margin: "4px 0" }}>
            {selectedOwnCard === null ? (
              <span>1. アタックに使う<b>自分の裏の手札</b>を選ぶ</span>
            ) : ownCardSelecting ? (
              <span style={{ color: C.green }}>✓ 手札を選択！<b>相手のカード</b>を選ぼう</span>
            ) : !selectedTarget ? (
              <span>2. アタックする<b>相手の伏せカード</b>を選ぶ</span>
            ) : (
              <span>3. 相手のカードの<b>数字を宣言</b>する</span>
            )}
          </div>
          {selectedOwnCard !== null && selectedTarget && (
            <>
              <NumberSelector value={guessNumber} onChange={onGuessChange} disabled={disabled} />
              <button
                style={btnStyle(true, disabled || guessNumber === null)}
                onClick={onAttack}
                disabled={disabled || guessNumber === null}
              >
                {guessNumber !== null ? "アタック！" : "数字を選んでください"}
              </button>
              <button
                style={{ ...btnStyle(false), marginTop: -4 }}
                onClick={onCancel}
                disabled={disabled}
              >
                キャンセル
              </button>
            </>
          )}
          {(selectedOwnCard === null || !selectedTarget) && (
            <button
              style={btnStyle(true, true)}
              disabled={true}
            >
              カードを選んでください
            </button>
          )}
        </>
      )}

      {phase === "continue" && (
        <>
          <div
            style={{
              ...labelStyle,
              color: C.green,
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            正解！ 続けますか？
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnStyle(true, disabled)} onClick={onContinue} disabled={disabled}>
              再アタック
            </button>
            <button style={btnStyle(false, disabled)} onClick={onStay} disabled={disabled}>
              ステイ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── GameLog Component ─── */
export function GameLog({ log }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [log]);

  return (
    <div
      ref={ref}
      style={{
        maxHeight: 56,
        overflowY: "auto",
        fontSize: 10,
        color: C.gray4,
        lineHeight: 1.6,
        padding: "4px 8px",
        fontFamily: "'Noto Sans JP', sans-serif",
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
      }}
    >
      {log.map((entry, i) => (
        <div
          key={i}
          className="log-line"
          style={{
            borderBottom: `1px solid ${C.gray1}`,
            padding: "2px 0",
          }}
        >
          {entry}
        </div>
      ))}
    </div>
  );
}

/* ─── GameBoard Layout ─── */
export function GameBoard({
  state,
  currentViewPlayer,
  cardSize,
  onCardClick,
  selectedTarget,
  selectedOwnCard, // New for pair mode
  ownCardSelecting = false, // brief lock after own card pick in pair mode
  cardAnims = {},
  turnPulse = false,
  showCombo = false,
  comboCount = 0,
}) {
  const { players, mode } = state;
  const count = players.length;

  // Simple getter for team since getTeam is usually imported in logic
  const getTeamLabel = (idx) => (idx % 2 === 0 ? "A" : "B");
  const myTeam = mode === "pair" ? getTeamLabel(currentViewPlayer) : null;

  const boardStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
    width: "100%",
    padding: "8px 0",
    minHeight: 0,
  };

  const reordered = [];
  for (let i = 0; i < count; i++) {
    reordered.push(players[(currentViewPlayer + i) % count]);
  }

  const makeSeat = (player, pIdx) => (
    <Seat
      key={player.id}
      player={player}
      isCurrentPlayer={pIdx === state.currentPlayer}
      cardSize={cardSize}
      isOwnSeat={pIdx === currentViewPlayer}
      onCardClick={onCardClick}
      selectedCardIndex={selectedTarget}
      selectedOwnCardIndex={selectedOwnCard}
      ownCardSelecting={ownCardSelecting}
      phase={state.phase}
      mode={mode}
      team={mode === "pair" ? getTeamLabel(pIdx) : null}
      myTeam={myTeam}
      tossedCard={state.tossedCard}
      cardAnims={cardAnims}
    />
  );

  if (count === 2) {
    return (
      <div style={boardStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {makeSeat(reordered[1], (currentViewPlayer + 1) % count)}
        </div>
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
          animClass={cardAnims[`${state.currentPlayer}-new`] || ""}
          showCombo={showCombo}
          comboCount={comboCount}
        />
        <div className={`my-area${turnPulse ? " turn-pulse" : ""}`} style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>
          {makeSeat(reordered[0], currentViewPlayer)}
        </div>
      </div>
    );
  }

  if (count === 3) {
    return (
      <div style={boardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            width: "100%",
          }}
        >
          {makeSeat(reordered[1], (currentViewPlayer + 1) % count)}
          {makeSeat(reordered[2], (currentViewPlayer + 2) % count)}
        </div>
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
          animClass={cardAnims[`${state.currentPlayer}-new`] || ""}
          showCombo={showCombo}
          comboCount={comboCount}
        />
        <div className={`my-area${turnPulse ? " turn-pulse" : ""}`} style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>
          {makeSeat(reordered[0], currentViewPlayer)}
        </div>
      </div>
    );
  }

  // 4 players — diamond
  return (
    <div style={boardStyle}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {makeSeat(reordered[2], (currentViewPlayer + 2) % count)}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
        }}
      >
        {makeSeat(reordered[1], (currentViewPlayer + 1) % count)}
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
          animClass={cardAnims[`${state.currentPlayer}-new`] || ""}
          showCombo={showCombo}
          comboCount={comboCount}
        />
        {makeSeat(reordered[3], (currentViewPlayer + 3) % count)}
      </div>
      <div className={`my-area${turnPulse ? " turn-pulse" : ""}`} style={{ display: "flex", justifyContent: "center", paddingBottom: 10 }}>
        {makeSeat(reordered[0], currentViewPlayer)}
      </div>
    </div>
  );
}
