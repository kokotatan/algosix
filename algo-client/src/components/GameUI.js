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
};

/* ─── Card Component ─── */
export function Card({
  card,
  size = "xl",
  onClick,
  isSelectable = false,
  isSelected = false,
  isOwn = false,
  showNumber = false,
}) {
  const dim = CARD_SIZES[size];
  const isRevealed = card.revealed || showNumber;
  const isBlack = card.color === "black";

  const baseStyle = {
    width: dim.w,
    height: dim.h,
    borderRadius: 4,
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
    const faceStyle = {
      ...baseStyle,
      background: isBlack ? C.black : C.white,
      color: isBlack ? C.white : C.black,
      border: isSelected
        ? `3px solid ${C.green}`
        : `2px solid ${C.black}`,
      boxShadow: isSelected
        ? `0 0 8px ${C.green}66`
        : "0 2px 4px rgba(0,0,0,0.1)",
      transform: isSelected ? "translateY(-4px)" : "none",
    };

    return (
      <div
        style={faceStyle}
        onClick={onClick}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
      >
        {card.number}
        {isOwn && card.revealed && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 3,
              fontSize: 7,
              background: C.red,
              color: "#fff",
              padding: "1px 3px",
              borderRadius: 2,
              fontWeight: 700,
              letterSpacing: 0.5,
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
    borderRadius: isBlack ? 2 : "50%",
    background: isBlack ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)",
  };

  return (
    <div
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
  phase,
  mode,
  team,
  myTeam,
  tossedCard, // new prop passed from GameBoard
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
    <div style={seatStyle}>
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
              borderRadius: "50%",
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
          
          // Enforce picking own card first in pair mode
          const canSelectTarget = isTargetSelectable && (mode !== "pair" || selectedOwnCardIndex !== null);
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
export function DeckStack({ count, drawnCard, showDrawn }) {
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
    <div style={stackStyle}>
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
              borderRadius: 3,
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
              borderRadius: 3,
              border: `2px dashed ${C.gray3}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              color: C.gray3,
            }}
          >
            空
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
          <Card card={drawnCard} size="lg" showNumber={true} />
        </div>
      )}
    </div>
  );
}

/* ─── Number Selector Component ─── */
export function NumberSelector({ value, onChange }) {
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
          onClick={() => onChange(i)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 0,
            border: `2px solid ${C.black}`,
            background: value === i ? C.black : C.white,
            color: value === i ? C.white : C.black,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            transition: "all 0.15s",
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
  guessNumber,     // For individual mode
  onDraw,
  onAttack,
  onStay,
  onContinue,
  onGuessChange,
  currentPlayerName,
  lastAction,
}) {
  const panelStyle = {
    background: C.white,
    border: `2px solid ${C.black}`,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    width: "100%",
    maxWidth: 400,
  };

  const btnStyle = (filled = true, disabled = false) => ({
    padding: "10px 24px",
    borderRadius: 0,
    border: `2px solid ${disabled ? C.gray2 : C.black}`,
    background: disabled ? C.gray1 : filled ? C.black : C.white,
    color: disabled ? C.gray3 : filled ? C.white : C.black,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "'Noto Sans JP', sans-serif",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s",
    minWidth: 100,
  });

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
          <button style={btnStyle(true)} onClick={onDraw}>
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
              <NumberSelector value={guessNumber} onChange={onGuessChange} />
              <button
                style={btnStyle(true, guessNumber === null)}
                onClick={onAttack}
                disabled={guessNumber === null}
              >
                アタック！
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
              <span>1. アタックに使う<b>自分の手札</b>を選ぶ</span>
            ) : (
              <span>2. アタックする<b>相手の伏せカード</b>を選ぶ</span>
            )}
          </div>
          <button
            style={btnStyle(true, !selectedTarget || selectedOwnCard === null)}
            onClick={onAttack}
            disabled={!selectedTarget || selectedOwnCard === null}
          >
            {selectedTarget !== null && selectedOwnCard !== null
              ? "選択したカードで宣言する！"
              : "カードを選んでください"}
          </button>
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
            <button style={btnStyle(true)} onClick={onContinue}>
              再アタック
            </button>
            <button style={btnStyle(false)} onClick={onStay}>
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

  const makeSeat = (player) => (
    <Seat
      key={player.id}
      player={player}
      isCurrentPlayer={player.id === state.currentPlayer}
      cardSize={cardSize}
      isOwnSeat={player.id === currentViewPlayer}
      onCardClick={onCardClick}
      selectedCardIndex={selectedTarget}
      selectedOwnCardIndex={selectedOwnCard}
      phase={state.phase}
      mode={mode}
      team={mode === "pair" ? getTeamLabel(player.id) : null}
      myTeam={myTeam}
      tossedCard={state.tossedCard}
    />
  );

  if (count === 2) {
    return (
      <div style={boardStyle}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {makeSeat(reordered[1])}
        </div>
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          {makeSeat(reordered[0])}
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
          {makeSeat(reordered[1])}
          {makeSeat(reordered[2])}
        </div>
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
        />
        <div style={{ display: "flex", justifyContent: "center" }}>
          {makeSeat(reordered[0])}
        </div>
      </div>
    );
  }

  // 4 players — diamond
  return (
    <div style={boardStyle}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {makeSeat(reordered[2])}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          alignItems: "center",
        }}
      >
        {makeSeat(reordered[1])}
        <DeckStack
          count={state.deck.length}
          drawnCard={state.drawnCard}
          showDrawn={currentViewPlayer === state.currentPlayer}
        />
        {makeSeat(reordered[3])}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {makeSeat(reordered[0])}
      </div>
    </div>
  );
}
