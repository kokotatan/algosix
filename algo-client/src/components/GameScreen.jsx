import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  GameBoard,
  ActionPanel,
  GameLog,
  Card,
} from "./GameUI";
import { CpuKnowledge, shouldReattack, cpuSelectToss, cpuDecide } from "../lib/cpuAI";
import { triggerCardAnim } from "../lib/animUtils";
import {
  drawCard,
  attack,
  stayAction,
  continueAction,
  getCardSize,
  getPartnerIndex,
  partnerToss,
  startAttackFromToss,
  pairAttack,
  pairStayAction,
  pairContinueAction,
} from "../lib/gameLogic";
import { ScreenWrapper, OutlinedButton } from "./UXComponents";
import { STAMPS } from "../lib/stamps";

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

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", height: 12 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: 0,
          background: "currentColor",
          animation: `dotPulse 1s ease-in-out ${i * 0.15}s infinite`
        }}/>
      ))}
    </div>
  );
}

function ThinkingIndicator({ name, phase }) {
  const msg = {
    draw:     "DRAWING...",
    attack:   "THINKING...",
    continue: "THINKING...",
    waiting:  "WAITING...",
  }[phase] ?? "WAITING";

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 8, 
      background: "var(--gray1)", 
      padding: "6px 14px", 
      borderRadius: 0,
      fontSize: 10,
      fontWeight: 800,
      color: "var(--gray4)",
      letterSpacing: "0.05em",
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)"
    }}>
      <ThinkingDots />
      <span>{name.toUpperCase()} IS {msg}</span>
    </div>
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
      width:8, height:8, borderRadius:0, background:color,
      display:"inline-block", flexShrink:0,
      boxShadow:`0 0 0 2px ${color}33`, transition:"background .4s",
    }}/>
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

function PassScreen({ playerName, onReady, message = "に渡してください", subMessage = "準備ができたらボタンを押してください" }) {
  return (
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
          borderRadius: 0,
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
  );
}

function PartnerTossScreen({ partnerName, hand, onToss, players, currentPlayer }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  // Build a list of other players to show their card arrangements
  const otherPlayers = players ? players.filter((_, i) => i !== (currentPlayer != null ? getPartnerIndex(players.length, currentPlayer) : -1)) : [];

  return (
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
        <div style={{ marginBottom: 16, padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 0 }}>
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
  );
}

/* ─── Game Screen ─── */
export default function GameScreen({ gameState, onGameStateChange, onGameEnd, onHome, playerNames, cpuSettings, onlineContext, selfId }) {
  if (!gameState) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center", 
        height: "100vh", 
        background: "var(--white)",
        color: "var(--black)", 
        fontFamily: "'Inter', sans-serif",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: "-0.02em"
      }}>
        <div className="spinning-loader" style={{ marginBottom: 20 }}></div>
        同期中...
      </div>
    );
  }
  const { isHost, roomId, socket, emit, on, off, onlinePlayers = [], stateFromFirebaseRef } = onlineContext || {};
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
  const [attackResult, setAttackResult] = useState(null); // { type: "correct"|"incorrect", detail }
  const pendingPassScreenRef = useRef(false);
  const attackResultTimerRef = useRef(null);
  const prevCurrentPlayerRef = useRef(null);
  const [ownCardSelecting, setOwnCardSelecting] = useState(false); // brief lock after own card pick in pair mode
  const ownCardSelectingTimerRef = useRef(null);

  const state = gameState;
  const currentPlayer = state.currentPlayer;
  
  const myIndexRaw = (onlineContext?.roomId && selfId)
    ? state?.players?.findIndex(p => String(p.id).trim().toLowerCase() === String(selfId).trim().toLowerCase())
    : state.currentPlayer;
  
  // Robust fallback for myIndex
  const myIndex = (myIndexRaw === -1 || myIndexRaw === undefined) ? 0 : myIndexRaw;
  const currentViewPlayer = myIndex;

  // オンラインモードで自分のターン（もしくはCPUターン）かどうか
  const isMyTurn = !onlineContext?.roomId
    || currentPlayer === myIndex
    || Boolean(state.players[currentPlayer]?.isCpu);

  const cardSize = getCardSize(state.players.length);

  const cpuKnowledgeRefs = useRef({});

  useEffect(() => {
    // Only trigger pass screen logic when currentPlayer actually changes (not just state.players updating)
    const playerActuallyChanged = prevCurrentPlayerRef.current !== currentPlayer;
    prevCurrentPlayerRef.current = currentPlayer;

    if (playerActuallyChanged && !onlineContext?.roomId && state.mode === "individual" && (!cpuSettings || !state.players[currentPlayer].isCpu)) {
      pendingPassScreenRef.current = true;
      setShowPassScreen(true); // lastAction effect will hide this if an attack result needs to show first
    } else if (!playerActuallyChanged) {
      // currentPlayer unchanged (e.g. state.players updated after card reveal) — skip pass screen
    } else {
      pendingPassScreenRef.current = false;
    }
    setSelectedTarget(null);
    setSelectedOwnCard(null);
    setGuessNumber(null);
  }, [currentPlayer, state.mode, cpuSettings, state.players, onlineContext?.roomId]);

  useEffect(() => {
    setSelectedTarget(null);
    setSelectedOwnCard(null);
    setGuessNumber(null);
    if (ownCardSelectingTimerRef.current) clearTimeout(ownCardSelectingTimerRef.current);
    setOwnCardSelecting(false);
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
  }, [state.currentPlayer, state.phase, currentViewPlayer]);

  // Handle Action Animations (Flip, Shake, Combo) + Attack Result Overlay
  useEffect(() => {
    if (!state.lastAction) return;
    const la = state.lastAction;

    if (la.type === "correct") {
      // Show attack result overlay in offline mode
      if (!onlineContext?.roomId && la.detail) {
        if (pendingPassScreenRef.current) setShowPassScreen(false); // hide pass screen while overlay shows
        setAttackResult({ type: "correct", detail: la.detail });
        if (attackResultTimerRef.current) clearTimeout(attackResultTimerRef.current);
        attackResultTimerRef.current = setTimeout(() => {
          setAttackResult(null);
          if (pendingPassScreenRef.current) setShowPassScreen(true);
        }, 1800);
      }
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
      // Show attack result overlay in offline mode
      if (!onlineContext?.roomId && la.detail) {
        if (pendingPassScreenRef.current) setShowPassScreen(false);
        setAttackResult({ type: "incorrect", detail: la.detail });
        if (attackResultTimerRef.current) clearTimeout(attackResultTimerRef.current);
        attackResultTimerRef.current = setTimeout(() => {
          setAttackResult(null);
          if (pendingPassScreenRef.current) setShowPassScreen(true);
        }, 1800);
      }
      setComboCount(0);
      if (la.targetPlayerIndex !== undefined && la.targetCardIndex !== undefined) {
        triggerCardAnim(setCardAnims, `${la.targetPlayerIndex}-${la.targetCardIndex}`, "shake", 500);
      }
    } else if (la.type === "stay") {
      setComboCount(0);
    }
  }, [state.lastAction, onlineContext?.roomId]);

  // --- ONLINE STATE SYNC LOGIC ---

  // Host: Broadcast masked state to all players (including self) whenever state changes.
  // stateFromFirebaseRef guards against infinite loop:
  //   local action → setGameState → effect fires → write to Firebase
  //   → Firebase triggers sync_state → AlgoApp sets stateFromFirebaseRef=true → setGameState
  //   → effect fires → sees stateFromFirebaseRef=true → SKIP (no re-write)
  useEffect(() => {
    if (!onlineContext || !isHost || !state) return;

    // If this state update came FROM Firebase, skip writing back to avoid infinite loop.
    if (stateFromFirebaseRef?.current) {
      stateFromFirebaseRef.current = false;
      return;
    }

    // Write masked state for each peer
    onlinePlayers.forEach(p => {
      if (p.isHost) return; // Already written above

      const targetId = p.id;
      if (!targetId) return;

      const pIndex = state.players.findIndex(sp => String(sp.id) === String(targetId));
      if (pIndex === -1) return;

      const maskedState = JSON.parse(JSON.stringify(state)); // Deep clone

      maskedState.players.forEach((sp, i) => {
        if (i !== pIndex) {
          sp.hand.forEach(c => {
            if (!c.revealed) {
              c.number = null; // hide number to prevent cheat
            }
          });
        }
      });
      // Mask drawn card if it's not the peer's turn
      if (state.currentPlayer !== pIndex && maskedState.drawnCard) {
        maskedState.drawnCard.number = null;
      }
      emit("host_sync_state", { roomId, targetId: p.id, state: maskedState });
    });
  }, [state, isHost, onlineContext, onlinePlayers, emit, roomId, selfId, stateFromFirebaseRef]);

  // --- ACTION DISPATCHER ---
  const dispatchAction = useCallback((actionType, payload) => {
    if (onlineContext && onlineContext.roomId && !isHost) {
      // Peer sends action to host instead of executing it locally
      console.log("[PEER] sending peer_action:", actionType, "roomId:", roomId);
      emit("peer_action", { roomId, action: actionType, payload });
      return;
    }

    // Local / Host processing
    console.log("[HOST/LOCAL] processing action:", actionType);
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
        default:
          break;
      }
      
      // In online mode, gameover is handled via sync_state arriving from Firebase
      // (AlgoApp's sync_state handler calls handleGameEnd). For offline, handle locally.
      if (newState.phase === "gameover" && !onlineContext?.roomId) {
         setTimeout(() => onGameEnd(newState), 800);
      }
      return newState;
    });
  }, [onlineContext, isHost, emit, roomId, onGameStateChange, onGameEnd]);

  // Keep a stable ref to the latest dispatchAction so handlePeerAction doesn't re-register on every render
  const dispatchActionRef = useRef(dispatchAction);
  useEffect(() => { dispatchActionRef.current = dispatchAction; });

  // Host: Listen for peer actions and dispatch them (registered once, stable handler)
  useEffect(() => {
    if (!onlineContext?.roomId || !isHost) return;
    console.log("[HOST] registering peer_action listener");
    const handlePeerAction = (data) => {
      console.log("[HOST] peer_action received:", data.action);
      dispatchActionRef.current(data.action, data.payload);
    };
    on("peer_action", handlePeerAction);
    return () => off("peer_action", handlePeerAction);
  }, [onlineContext?.roomId, isHost, on, off]);

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

  const dismissAttackResult = () => {
    if (attackResultTimerRef.current) clearTimeout(attackResultTimerRef.current);
    attackResultTimerRef.current = null;
    setAttackResult(null);
    if (pendingPassScreenRef.current) setShowPassScreen(true);
  };

  const handleDraw = () => {
    dispatchAction("draw");
  };

  const handleStay = () => {
    dispatchAction("stay");
  };

  const handleContinue = () => {
    dispatchAction("continue");
  };

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
  }, [currentPlayer, state.phase, state.tossedCard, cpuSettings, dispatchAction, state.players]);

  if (state.phase === "gameover") {
    return null;
  }

  if (showPassScreen && state.mode === "individual") {
    return (
      <ScreenWrapper>
        <PassScreen
          playerName={state.players[currentPlayer].name}
          onReady={() => setShowPassScreen(false)}
        />
      </ScreenWrapper>
    );
  }

  // Pair mode extra phases (skip screens for CPU players)
  if (state.mode === "pair") {
    const partnerIdx = getPartnerIndex(state.players.length, currentPlayer);
    const partner = state.players[partnerIdx];

    if (state.phase === "pass_to_partner") {
      // If online mode, skip swap screen entirely
      if (onlineContext?.roomId) return null;
      // If partner is CPU, don't show pass screen — let useEffect handle auto-toss
      if (!partner?.isCpu) {
        const partnerName = partner.name;
        return (
          <ScreenWrapper>
            <PassScreen
              playerName={partnerName}
              message="さんに渡してください"
              subMessage="トスをしてもらいます"
              onReady={() => onGameStateChange({ ...state, phase: "partner_toss" })}
            />
          </ScreenWrapper>
        );
      }
      // CPU partner: show thinking indicator on the game board (falls through to game board render)
    }

    if (state.phase === "partner_toss") {
      // This phase is only reached when partner is human
      return (
        <ScreenWrapper showGeo={true}>
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
        </ScreenWrapper>
      );
    }

    if (state.phase === "pass_back") {
      // If online mode, skip swap screen entirely
      if (onlineContext?.roomId) return null;
      // If current player is CPU, skip pass_back screen (useEffect handles it)
      if (!state.players[currentPlayer].isCpu) {
        const currentName = state.players[currentPlayer].name;
        return (
          <ScreenWrapper>
            <PassScreen
              playerName={currentName}
              message="さんに戻してください"
              subMessage="攻撃を開始します"
            onReady={() => dispatchAction("startAttack", {})}
            />
          </ScreenWrapper>
        );
      }
    }
  }

  const handleCardClick = (playerId, cardIdx, isOwnGroup) => {
    // 自分のターンでない場合は何もしない
    if (!isMyTurn || state.phase !== "attack") return;

    if (isOwnGroup) {
      setSelectedOwnCard(cardIdx);
      // ペア戦: 自分のカードを選択直後は相手カードを一時ロック（誤タップ防止）
      if (state.mode === "pair") {
        if (ownCardSelectingTimerRef.current) clearTimeout(ownCardSelectingTimerRef.current);
        setOwnCardSelecting(true);
        ownCardSelectingTimerRef.current = setTimeout(() => setOwnCardSelecting(false), 450);
      }
    } else {
      setSelectedTarget({ player: playerId, card: cardIdx });
      setGuessNumber(null);
    }
  };

  const handleAttack = () => {
    if (!selectedTarget) return;

    // selectedTarget.player は player.id（文字列IDの場合あり）なので
    // gameLogic が期待する数値インデックスに変換する
    const targetPlayerIndex = state.players.findIndex(
      p => String(p.id) === String(selectedTarget.player)
    );
    if (targetPlayerIndex === -1) return;

    if (state.mode === "pair") {
      if (selectedOwnCard === null || guessNumber === null) return;
      dispatchAction("pairAttack", {
        targetPlayer: targetPlayerIndex,
        targetCard: selectedTarget.card,
        ownCard: selectedOwnCard,
        guessNumber: guessNumber,
      });
      setSelectedTarget(null);
      setSelectedOwnCard(null);
      setGuessNumber(null);
    } else {
      if (guessNumber === null) return;
      dispatchAction("attack", {
        targetPlayer: targetPlayerIndex,
        targetCard: selectedTarget.card,
        guessNumber: guessNumber,
      });
      setSelectedTarget(null);
      setGuessNumber(null);
    }
  };

  return (
    <ScreenWrapper showGeo={false} scroll={true}>
      {/* Attack Result Overlay (offline mode) */}
      {attackResult && (() => {
        const isPairContinue = state.mode === "pair" && state.phase === "continue" && attackResult.type === "correct";
        const overlayBtnStyle = (filled) => ({
          padding: "10px 20px",
          border: `2px solid ${filled ? "#28a028" : "#28a028"}`,
          background: filled ? "#28a028" : "#f0fff4",
          color: filled ? "#fff" : "#28a028",
          borderRadius: 0,
          fontSize: 14,
          fontWeight: 800,
          cursor: "pointer",
          fontFamily: "'Noto Sans JP', sans-serif",
        });
        return (
          <div
            className="attack-result-overlay"
            onClick={!isPairContinue ? dismissAttackResult : undefined}
          >
            <div className={`attack-result-badge ${attackResult.type}`}>
              <div className="attack-result-label">
                {attackResult.type === "correct" ? "成功！" : "失敗..."}
              </div>
              <div className="attack-result-detail">{attackResult.detail}</div>
              {isPairContinue ? (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    style={overlayBtnStyle(true)}
                    onClick={(e) => { e.stopPropagation(); dismissAttackResult(); handleContinue(); }}
                  >
                    再アタック
                  </button>
                  <button
                    style={overlayBtnStyle(false)}
                    onClick={(e) => { e.stopPropagation(); dismissAttackResult(); handleStay(); }}
                  >
                    ステイ
                  </button>
                </div>
              ) : (
                <div className="attack-result-hint">タップして続ける</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Stamp Flow Overlay - only in online rooms */}
      {onlineContext?.roomId && (
        <div className="stamp-overlay">
          {onlinePlayers.map(p => p.lastStamp && (
            <div key={p.lastStamp.ts} className="stamp-item-flow">
              <span style={{ fontSize: 10, opacity: 0.6, marginRight: 8 }}>{p.name}</span>
              {STAMPS.find(s => s.id === p.lastStamp.id)?.label || p.lastStamp.id}
            </div>
          ))}
        </div>
      )}

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
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--white)",
          borderBottom: "1.5px solid var(--gray1)",
          gap: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          zIndex: 100,
          position: "sticky",
          top: 0
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 900,
              fontFamily: "'Inter', sans-serif",
              color: "var(--black)",
              letterSpacing: "0.02em"
            }}
          >
            ALGOSIX
          </span>
          <div style={{ 
            background: "var(--gray1)", 
            padding: "4px 10px", 
            borderRadius: 0, 
            fontSize: 10, 
            fontWeight: 800, 
            color: "var(--gray4)",
            display: "flex",
            alignItems: "center",
            gap: 4
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gray4)", opacity: 0.8 }}>DECK</span> {state.deck.length}
          </div>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minWidth: 80 }}>
          {state.currentPlayer === currentViewPlayer ? (
             <div style={{ 
               background: "var(--black)",                color: "var(--white)", 
                padding: "6px 16px", 
                borderRadius: 0, 
                fontSize: 12, 
               fontWeight: 900,
               boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
               animation: "pulse 2s infinite ease-in-out"
             }}>
               YOUR TURN
             </div>
          ) : (
             <ThinkingIndicator
               name={state.players[currentPlayer].name}
               phase={onlineContext?.roomId && !state.players[currentPlayer]?.isCpu ? "waiting" : state.phase}
             />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {onlineContext?.roomId && <ConnStatus game={state} />}
          <button
            onClick={() => setShowRules(true)}
            style={{
              padding: "4px 12px",
              borderRadius: 0,
              background: "var(--gray1)",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 800,
              color: "var(--gray4)",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            RULES
          </button>
          <button
            onClick={() => setShowHomeConfirm(true)}
            style={{
              padding: "4px 12px",
              borderRadius: 0,
              background: "var(--gray1)",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 800,
              color: "var(--gray4)",
              fontFamily: "'Inter', sans-serif"
            }}
          >
            HOME
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
        ownCardSelecting={ownCardSelecting}
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
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 4,
            position: "relative",
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
            borderRadius: 0,
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
          ownCardSelecting={ownCardSelecting}
          guessNumber={guessNumber}
          onDraw={handleDraw}
          onAttack={handleAttack}
          onStay={handleStay}
          onContinue={handleContinue}
          onCancel={() => {
            setSelectedTarget(null);
            setSelectedOwnCard(null);
            setGuessNumber(null);
          }}
          onGuessChange={setGuessNumber}
          currentPlayerName={state.players[currentPlayer].name}
          lastAction={state.lastAction}
          disabled={isThinking || !isMyTurn}
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
          borderRadius: 0,
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
