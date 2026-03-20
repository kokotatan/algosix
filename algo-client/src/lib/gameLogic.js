// gameLogic.js — Pure functions for the Algo card game (individual + pair modes)

/**
 * Create a full deck of 24 cards (black 0–11 + white 0–11)
 */
export function createDeck() {
  const deck = [];
  for (let i = 0; i <= 11; i++) {
    deck.push({ id: `b${i}`, color: "black", number: i, revealed: false });
    deck.push({ id: `w${i}`, color: "white", number: i, revealed: false });
  }
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
export function shuffleDeck(deck) {
  const a = [...deck];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sort hand: ascending by number, black before white on ties
 */
export function sortHand(hand) {
  return [...hand].sort((a, b) =>
    a.number !== b.number ? a.number - b.number : a.color === "black" ? -1 : 1
  );
}

/**
 * Get initial hand size based on player count (individual mode)
 */
export function getInitialHandSize(playerCount) {
  if (playerCount === 2) return 4;
  if (playerCount === 3) return 3;
  return 2;
}

/* ─── Pair Mode Helpers ─── */

/**
 * Get team letter for a seat index (even→A, odd→B)
 */
export function getTeam(seatIndex) {
  return seatIndex % 2 === 0 ? "A" : "B";
}

/**
 * Get the partner's index for a given player
 */
export function getPartnerIndex(numPlayers, myIndex) {
  const myTeam = getTeam(myIndex);
  for (let i = 0; i < numPlayers; i++) {
    if (i !== myIndex && getTeam(i) === myTeam) return i;
  }
  return null;
}

/**
 * Check if attacker can attack a target
 */
export function isAttackable(attackerIndex, targetIndex, mode) {
  if (mode === "individual") return attackerIndex !== targetIndex;
  return getTeam(attackerIndex) !== getTeam(targetIndex);
}

/**
 * Check if a player is eliminated (all cards revealed)
 */
function isElim(player) {
  return player.hand.every(c => c.revealed);
}

/* ─── Init ─── */

/**
 * Initialize a new game
 * @param {string[]} playerNames
 * @param {string} mode - "individual" or "pair"
 */
export function initGame(playerNames, mode = "individual", cpuSettings = []) {
  const playerCount = playerNames.length;
  let deck = shuffleDeck(createDeck());

  const handSize = mode === "pair"
    ? Math.floor(24 / playerCount)
    : getInitialHandSize(playerCount);

  let di = 0;
  const players = playerNames.map((p, i) => {
    const name = typeof p === "string" ? p : p.name;
    const id = typeof p === "string" ? i : (p.id !== undefined ? p.id : i);
    const hand = sortHand(deck.slice(di, di + handSize));
    di += handSize;
    return { 
      id, 
      name, 
      hand, 
      isOut: false,
      isCpu: cpuSettings[i] || (p && p.isCpu) || false,
    };
  });

  const teams = mode === "pair" ? {
    A: Array.from({ length: playerCount }, (_, i) => i).filter(i => i % 2 === 0),
    B: Array.from({ length: playerCount }, (_, i) => i).filter(i => i % 2 !== 0),
  } : null;

  return {
    players,
    deck: mode === "pair" ? [] : deck.slice(di),
    currentPlayer: 0,
    phase: mode === "pair" ? "pass_to_partner" : "draw",
    drawnCard: null,
    lastAction: null,
    log: ["ゲームを開始しました"],
    winner: null,
    turnCount: 0,
    mode,
    teams,
    tossedCard: null,
    myAttackCardIndex: null,
  };
}

/* ─── Individual Mode Actions ─── */

/**
 * Draw a card from the deck (individual mode)
 */
export function drawCard(state) {
  if (state.deck.length === 0) {
    return {
      ...state,
      phase: "attack",
      drawnCard: null,
      lastAction: { type: "draw", detail: "山札なし — 直接アタック" },
    };
  }
  const [card, ...rest] = state.deck;
  return {
    ...state,
    deck: rest,
    drawnCard: card,
    phase: "attack",
    lastAction: { type: "draw", detail: `${state.players[state.currentPlayer].name} がカードを引いた` },
  };
}

/* ─── Pair Mode Actions ─── */

/**
 * Partner toss — partner selects a card to show the current player
 * @param {number} cardIndex — index in partner's hand
 */
export function partnerToss(state, cardIndex) {
  const partnerIdx = getPartnerIndex(state.players.length, state.currentPlayer);
  const partner = state.players[partnerIdx];
  const card = partner.hand[cardIndex];

  if (!card || card.revealed) return state;

  return {
    ...state,
    tossedCard: {
      color: card.color,
      number: card.number,
      cardIndex,
    },
    phase: "pass_back",
    lastAction: { type: "toss", detail: `${partner.name} がカードを1枚トスしました` },
    log: [...state.log, `${partner.name} がカードを1枚トスしました`],
  };
}

/**
 * After pass_back, move to attack phase
 */
export function startAttackFromToss(state) {
  return {
    ...state,
    phase: "attack",
  };
}

/**
 * Pair mode attack: select own card + opponent card + declare a number
 * @param {number} targetPlayerIndex
 * @param {number} targetCardIndex
 * @param {number} myCardIndex - index of own card used for attack
 * @param {number} guessNumber - the number declared by the attacker
 */
export function pairAttack(state, targetPlayerIndex, targetCardIndex, myCardIndex, guessNumber) {
  const currentIdx = state.currentPlayer;
  const targetPlayer = state.players[targetPlayerIndex];
  const targetCard = targetPlayer.hand[targetCardIndex];
  const myCard = state.players[currentIdx].hand[myCardIndex];

  if (!targetCard || targetCard.revealed) return state;
  if (!myCard || myCard.revealed) return state;

  const correct = targetCard.number === guessNumber;
  const currentName = state.players[currentIdx].name;
  const targetName = targetPlayer.name;
  const colorStr = targetCard.color === "black" ? "黒" : "白";
  const declareStr = `${colorStr}${guessNumber}`;

  if (correct) {
    // Reveal opponent's card
    const newPlayers = state.players.map((p, i) => {
      if (i !== targetPlayerIndex) return p;
      const newHand = p.hand.map((c, j) =>
        j === targetCardIndex ? { ...c, revealed: true } : c
      );
      return { ...p, hand: newHand };
    });

    // Check if target player is eliminated
    const targetAllRevealed = newPlayers[targetPlayerIndex].hand.every(c => c.revealed);
    const newPlayersWithOut = newPlayers.map((p, i) => {
      if (i === targetPlayerIndex && targetAllRevealed) return { ...p, isOut: true };
      return p;
    });

    const actionDetail = `${currentName} → ${targetName}: ${declareStr} — 正解`;
    const newLog = [...state.log, actionDetail];

    // Check win — all enemies out?
    const myTeam = getTeam(currentIdx);
    const allEnemiesOut = newPlayersWithOut
      .filter((_, i) => getTeam(i) !== myTeam)
      .every(p => p.isOut);

    if (allEnemiesOut) {
      return {
        ...state,
        players: newPlayersWithOut,
        phase: "gameover",
        winner: currentIdx,
        lastAction: { type: "correct", detail: actionDetail, targetPlayerIndex, targetCardIndex },
        log: newLog,
        myAttackCardIndex: myCardIndex,
      };
    }

    return {
      ...state,
      players: newPlayersWithOut,
      phase: "continue",
      lastAction: { type: "correct", detail: actionDetail, targetPlayerIndex, targetCardIndex },
      log: newLog,
      myAttackCardIndex: myCardIndex,
    };
  } else {
    // Incorrect — my card becomes revealed (face-up)
    const newPlayers = state.players.map((p, i) => {
      if (i !== currentIdx) return p;
      const newHand = p.hand.map((c, j) =>
        j === myCardIndex ? { ...c, revealed: true } : c
      );
      return { ...p, hand: newHand };
    });

    // Check if current player is eliminated
    const meAllRevealed = newPlayers[currentIdx].hand.every(c => c.revealed);
    const newPlayersWithOut = newPlayers.map((p, i) => {
      if (i === currentIdx && meAllRevealed) return { ...p, isOut: true };
      return p;
    });

    const actionDetail = `${currentName} → ${targetName}: ${declareStr} — 不正解`;
    const newLog = [...state.log, actionDetail];

    const nextPlayerIdx = getNextPlayer({ ...state, players: newPlayersWithOut });
    return {
      ...state,
      players: newPlayersWithOut,
      phase: "pass_to_partner",
      drawnCard: null,
      currentPlayer: nextPlayerIdx,
      lastAction: { 
        type: "incorrect", 
        detail: actionDetail,
        targetPlayerIndex,
        targetCardIndex,
        guessNumber
      },
      log: newLog,
      turnCount: state.turnCount + 1,
      tossedCard: null,
      myAttackCardIndex: null,
    };
  }
}

/**
 * Stay in pair mode — card stays face-down, turn ends
 */
export function pairStayAction(state) {
  const currentName = state.players[state.currentPlayer].name;
  const actionDetail = `${currentName} がステイした`;
  const nextPlayerIdx = getNextPlayer(state);

  return {
    ...state,
    phase: "pass_to_partner",
    currentPlayer: nextPlayerIdx,
    lastAction: { type: "stay", detail: actionDetail },
    log: [...state.log, actionDetail],
    turnCount: state.turnCount + 1,
    tossedCard: null,
    myAttackCardIndex: null,
  };
}

/**
 * Continue in pair mode — keep tossed card and return directly to attack phase
 */
export function pairContinueAction(state) {
  return {
    ...state,
    phase: "attack",
    myAttackCardIndex: null,
    lastAction: { type: "continue", detail: "再アタック" },
  };
}

/* ─── Individual Mode Attack ─── */

/**
 * Attack in individual mode
 */
export function attack(state, targetPlayerIndex, targetCardIndex, guessNumber) {
  const targetPlayer = state.players[targetPlayerIndex];
  const targetCard = targetPlayer.hand[targetCardIndex];

  if (!targetCard || targetCard.revealed) return state;

  const correct = targetCard.number === guessNumber;
  const currentName = state.players[state.currentPlayer].name;
  const targetName = targetPlayer.name;

  if (correct) {
    const newPlayers = state.players.map((p, i) => {
      if (i !== targetPlayerIndex) return p;
      const newHand = p.hand.map((c, j) =>
        j === targetCardIndex ? { ...c, revealed: true } : c
      );
      return { ...p, hand: newHand };
    });

    const targetAllRevealed = newPlayers[targetPlayerIndex].hand.every(c => c.revealed);
    const newPlayersWithOut = newPlayers.map((p, i) => {
      if (i === targetPlayerIndex && targetAllRevealed) return { ...p, isOut: true };
      return p;
    });

    const actionDetail = `${currentName} → ${targetName} のカード: ${targetCard.color === "black" ? "黒" : "白"}${guessNumber} — 正解`;
    const newLog = [...state.log, actionDetail];

    const opponents = newPlayersWithOut.filter((_, i) => i !== state.currentPlayer);
    const allOpponentsOut = opponents.every(p => p.isOut);

    if (allOpponentsOut) {
      return {
        ...state,
        players: newPlayersWithOut,
        phase: "gameover",
        winner: state.currentPlayer,
        lastAction: { type: "correct", detail: actionDetail, targetPlayerIndex, targetCardIndex },
        log: newLog,
      };
    }

    return {
      ...state,
      players: newPlayersWithOut,
      phase: "continue",
      lastAction: { type: "correct", detail: actionDetail, targetPlayerIndex, targetCardIndex },
      log: newLog,
    };
  } else {
    const actionDetail = `${currentName} → ${targetName} のカード: ${targetCard.color === "black" ? "黒" : "白"}${guessNumber} — 不正解`;
    const newLog = [...state.log, actionDetail];

    let newPlayers = state.players;
    if (state.drawnCard) {
      newPlayers = state.players.map((p, i) => {
        if (i !== state.currentPlayer) return p;
        const newHand = sortHand([...p.hand, { ...state.drawnCard, revealed: true }]);
        return { ...p, hand: newHand };
      });
    }

    const nextPlayerIdx = getNextPlayer(state);
    return {
      ...state,
      players: newPlayers,
      phase: "draw",
      drawnCard: null,
      currentPlayer: nextPlayerIdx,
      lastAction: { 
        type: "incorrect", 
        detail: actionDetail,
        targetPlayerIndex,
        targetCardIndex,
        guessNumber
      },
      log: newLog,
      turnCount: state.turnCount + 1,
    };
  }
}

/**
 * Stay — add drawn card face-down and end turn (individual)
 */
export function stayAction(state) {
  const currentName = state.players[state.currentPlayer].name;
  let newPlayers = state.players;

  if (state.drawnCard) {
    newPlayers = state.players.map((p, i) => {
      if (i !== state.currentPlayer) return p;
      const newHand = sortHand([...p.hand, { ...state.drawnCard, revealed: false }]);
      return { ...p, hand: newHand };
    });
  }

  const actionDetail = `${currentName} がステイした`;
  const nextPlayerIdx = getNextPlayer(state);

  return {
    ...state,
    players: newPlayers,
    phase: "draw",
    drawnCard: null,
    currentPlayer: nextPlayerIdx,
    lastAction: { type: "stay", detail: actionDetail },
    log: [...state.log, actionDetail],
    turnCount: state.turnCount + 1,
  };
}

/**
 * Continue — re-attack (individual)
 */
export function continueAction(state) {
  return {
    ...state,
    phase: "attack",
    lastAction: { type: "continue", detail: "再アタック" },
  };
}

/**
 * Get next player index (skipping eliminated players)
 */
export function getNextPlayer(state) {
  const count = state.players.length;
  let next = (state.currentPlayer + 1) % count;
  let safety = 0;
  while (state.players[next].isOut && safety < count) {
    next = (next + 1) % count;
    safety++;
  }
  return next;
}

/**
 * Get card display size based on player count
 */
export function getCardSize(playerCount) {
  if (playerCount === 2) return "xl";
  if (playerCount === 3) return "lg";
  if (playerCount === 4) return "md";
  return "sm";
}

/**
 * Check if a player has won
 */
export function checkWin(state) {
  for (let i = 0; i < state.players.length; i++) {
    const opponents = state.players.filter((_, j) => j !== i);
    if (opponents.every(p => p.hand.every(c => c.revealed))) {
      return i;
    }
  }
  return null;
}
