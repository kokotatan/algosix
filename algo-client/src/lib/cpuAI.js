// src/lib/cpuAI.js
import { getPartnerIndex } from "./gameLogic";

export class CpuKnowledge {
  constructor(players, mySeatIndex, level) {
    this.mySeatIndex = mySeatIndex;
    this.level = level;
    this.initCandidates(players);
  }

  initCandidates(players) {
    this.candidates = players.map(p =>
      p.hand.map(() => new Set(Array.from({ length: 12 }, (_, i) => i)))
    );
  }

  updateFromState(game) {
    if (this.level === 'easy') return;

    // Reset and recalculate based entirely on current board state
    // This removes the need for step-by-step stateful tracking of reveals
    this.initCandidates(game.players);
    
    // 1. Collect all known cards
    const knownCards = [];
    game.players.forEach(p => {
      p.hand.forEach((c, ci) => {
        let isKnown = false;
        if (p.id === this.mySeatIndex) isKnown = true;
        if (c.revealed) isKnown = true;
        // If partner in pair mode, and card was tossed (we'll detect it if c.number is not undefined in state, wait, client state might not have number if not revealed unless it's tossed. 
        // Actually tossedCard is in game.tossedCard but wait, let's just check c.number !== undefined)
        if (c.number !== undefined) isKnown = true;

        if (isKnown) {
          knownCards.push({ player: p.id, cardIndex: ci, color: c.color, number: c.number });
          this.candidates[p.id][ci] = new Set([c.number]);
        }
      });
    });

    // 2. Remove known cards of same color from others
    knownCards.forEach(known => {
      game.players.forEach(p => {
        p.hand.forEach((c, ci) => {
          if (p.id === known.player && ci === known.cardIndex) return;
          if (c.color === known.color) {
            this.candidates[p.id][ci].delete(known.number);
          }
        });
      });
    });

    // 3. Iterative Left-to-Right Sorting Constraints
    let changed = true;
    let iterations = 0;
    while(changed && iterations < 20) {
      changed = false;
      iterations++;
      
      game.players.forEach(p => {
        for (let i = 0; i < p.hand.length - 1; i++) {
          const candsLeft = this.candidates[p.id][i];
          const candsRight = this.candidates[p.id][i+1];
          if (candsLeft.size === 0 || candsRight.size === 0) continue;

          const maxRight = Math.max(...candsRight);
          const minLeft = Math.min(...candsLeft);
          const colL = p.hand[i].color;
          const colR = p.hand[i+1].color;

          // Black < White if numbers are equal, so White and Black of same number exist.
          // hand is sorted ascending. Tie breaks: Black is left of White.
          // L=Black, R=White => L <= R
          // L=White, R=Black => L < R
          // L=Black, R=Black => L < R
          // L=White, R=White => L < R
          const isStrict = !(colL === 'black' && colR === 'white');

          for (let val of Array.from(candsLeft)) {
            if (isStrict ? val >= maxRight : val > maxRight) {
              candsLeft.delete(val);
              changed = true;
            }
          }

          for (let val of Array.from(candsRight)) {
            if (isStrict ? val <= minLeft : val < minLeft) {
              candsRight.delete(val);
              changed = true;
            }
          }
        }
      });
    }
  }

  // To be called from outside for HARD difficulty (tracking past wrong guesses)
  onWrongGuess(targetPlayer, targetCard, guessNumber) {
    if (this.level !== 'hard') return;
    if (this.candidates[targetPlayer] && this.candidates[targetPlayer][targetCard]) {
      this.candidates[targetPlayer][targetCard].delete(guessNumber);
    }
  }
}

// ターゲットの選択
export function selectTargetCard(level, game, mySeat, knowledge) {
  const mode = game.mode || "individual";
  const myTeam = mode === "pair" ? (mySeat % 2 === 0 ? "A" : "B") : null;
  
  // 敵の伏せカード一覧を作成
  const enemies = mode === "pair" 
    ? game.players.filter(p => (p.id % 2 === 0 ? "A" : "B") !== myTeam)
    : game.players.filter(p => p.id !== mySeat);

  const candidates = [];
  enemies.forEach(enemy => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        candidates.push({ playerIndex: enemy.id, cardIndex: ci, card });
      }
    });
  });

  if (candidates.length === 0) return null;

  // 簡単のためランダム選択（NORMAL/HARDでは候補数の少ないものや確率依存で選ぶ）
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 宣言数字の決定
export function selectGuessNumber(level, targetCard, knowledge) {
  const cands = Array.from(knowledge.candidates[targetCard.playerIndex][targetCard.cardIndex]);
  if (cands.length === 0) return Math.floor(Math.random() * 12);
  return cands[Math.floor(Math.random() * cands.length)];
}

// ターゲットと宣言数字の選定ロジック (NORMAL / HARD)
function getBestAttackIndividual(knowledge, enemies) {
  let bestCards = [];
  let minCandsSize = 999;

  enemies.forEach(enemy => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id][ci];
        const size = cands.size;
        if (size > 0 && size < minCandsSize) {
          minCandsSize = size;
          bestCards = [{ playerIndex: enemy.id, cardIndex: ci, cands }];
        } else if (size > 0 && size === minCandsSize) {
          bestCards.push({ playerIndex: enemy.id, cardIndex: ci, cands });
        }
      }
    });
  });

  if (bestCards.length === 0) return null;
  const picked = bestCards[Math.floor(Math.random() * bestCards.length)];
  const candArr = Array.from(picked.cands);
  const guessNumber = candArr[Math.floor(Math.random() * candArr.length)];

  return {
    targetPlayerIndex: picked.playerIndex,
    targetCardIndex: picked.cardIndex,
    guessNumber
  };
}

function getBestAttackPair(knowledge, enemies, myHand, myHiddenCards) {
  let bestMatch = null;
  let minCandsSize = 999;

  enemies.forEach(enemy => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id][ci];
        const matchingOwnCards = myHiddenCards.filter(myCard => cands.has(myCard.card.number));
        
        if (matchingOwnCards.length > 0) {
          const size = cands.size;
          if (size < minCandsSize) {
            minCandsSize = size;
            const myPicked = matchingOwnCards[Math.floor(Math.random() * matchingOwnCards.length)];
            bestMatch = {
              targetPlayerIndex: enemy.id,
              targetCardIndex: ci,
              myCardIndex: myPicked.index,
              guessNumber: myPicked.card.number
            };
          }
        }
      }
    });
  });

  if (bestMatch) return bestMatch;
  // Fallback if no matching cards conceptually
  return cpuDecidePairEASY(enemies, myHiddenCards);
}

function cpuDecidePairEASY(enemies, myHiddenCards) {
  const cands = [];
  enemies.forEach(e => e.hand.forEach((c, ci) => { if (!c.revealed) cands.push({ p: e.id, c: ci }); }));
  if (cands.length === 0 || myHiddenCards.length === 0) return null;
  
  const target = cands[Math.floor(Math.random() * cands.length)];
  const myCard = myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)];
  return {
    targetPlayerIndex: target.p,
    targetCardIndex: target.c,
    myCardIndex: myCard.index,
    guessNumber: myCard.card.number
  };
}

// CPUの個人戦アタック決定
export function cpuDecideIndividual(level, game, mySeat, knowledge) {
  const mode = game.mode || "individual";
  const myTeam = mode === "pair" ? (mySeat % 2 === 0 ? "A" : "B") : null;
  const enemies = mode === "pair" 
    ? game.players.filter(p => (p.id % 2 === 0 ? "A" : "B") !== myTeam)
    : game.players.filter(p => p.id !== mySeat);

  if (level === "easy") {
    const targetCard = selectTargetCard(level, game, mySeat, knowledge);
    if (!targetCard) return null;
    return {
      targetPlayerIndex: targetCard.playerIndex,
      targetCardIndex: targetCard.cardIndex,
      guessNumber: Math.floor(Math.random() * 12),
    };
  }

  return getBestAttackIndividual(knowledge, enemies);
}

// CPUのペア戦アタック決定
export function cpuDecidePair(level, game, mySeat, knowledge) {
  const myTeam = mySeat % 2 === 0 ? "A" : "B";
  const enemies = game.players.filter(p => (p.id % 2 === 0 ? "A" : "B") !== myTeam);
  const myHand = game.players[mySeat].hand;
  const myHiddenCards = myHand.map((c, i) => ({ card: c, index: i })).filter(({ card }) => !card.revealed);

  if (myHiddenCards.length === 0) return null;

  if (level === "easy") {
    return cpuDecidePairEASY(enemies, myHiddenCards);
  }

  return getBestAttackPair(knowledge, enemies, myHand, myHiddenCards);
}

export function cpuDecide(level, game, mySeat, knowledge, mode) {
  if (mode === "pair") return cpuDecidePair(level, game, mySeat, knowledge);
  return cpuDecideIndividual(level, game, mySeat, knowledge);
}

// CPUがトスするカードを選択
export function cpuSelectToss(level, game, mySeat, currentSeat, knowledge) {
  const myHand = game.players[mySeat].hand;
  const myHiddenIndices = myHand
    .map((c, i) => (c.revealed ? null : i))
    .filter(i => i !== null);

  if (myHiddenIndices.length === 0) return null;

  // 簡単のためランダム
  return myHiddenIndices[Math.floor(Math.random() * myHiddenIndices.length)];
}

// 再アタック判断
export function shouldReattack(level, knowledge, game, mySeat) {
  if (level === "easy") return Math.random() > 0.5;
  
  // NORMAL/HARD: if there's a 100% certain guess, keep going. Pick best size.
  const mode = game.mode || "individual";
  const myTeam = mode === "pair" ? (mySeat % 2 === 0 ? "A" : "B") : null;
  const enemies = mode === "pair" 
    ? game.players.filter(p => (p.id % 2 === 0 ? "A" : "B") !== myTeam)
    : game.players.filter(p => p.id !== mySeat);

  let minCandsSize = 999;
  enemies.forEach(enemy => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id][ci];
        if (cands.size < minCandsSize) minCandsSize = cands.size;
      }
    });
  });

  if (minCandsSize === 1) return true;
  if (minCandsSize === 2) return Math.random() > 0.4;
  return false;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CPUターンの非同期実行ラッパー
export async function runCpuTurn(game, mySeat, knowledge, level, mode, callbacks) {
  const { setThinking, onAction, onToss, waitForConfirm } = callbacks;

  // === トスフェーズ（ペア戦） ===
  if (mode === "pair" && game.phase === "pass_to_partner") {
    const partnerSeat = getPartnerIndex(game.players.length, mySeat);
    const partner = game.players[partnerSeat];

    if (partner.isCpu) {
      // パートナー(CPU)が現在のプレイヤー(自分自身はCPUでも人間でも)にトスする
      onToss({ thinking: true });
      await sleep(600 + Math.random() * 400);
      const tossedCardIdx = cpuSelectToss(level, game, partnerSeat, mySeat, knowledge);
      
      const tossedCardObj = partner.hand[tossedCardIdx];
      const tossedCardInfo = { color: tossedCardObj.color, number: tossedCardObj.number, cardIndex: tossedCardIdx };

      // トス結果を表示して確認待ち
      onToss({ thinking: false, tossedCardInfo, waitForConfirm: true });
      
      if (waitForConfirm) {
        await waitForConfirm(); 
      }
    } else {
      // パートナーが人間なら、通常のスマホ回しUI処理に委ねる
      return; 
    }
  }

  // === アタックフェーズ ===
  setThinking(true);
  await sleep(1000 + Math.random() * 800);
  setThinking(false);

  const action = cpuDecide(level, game, mySeat, knowledge, mode);
  if (!action) return; // やれることがない(終了時など)

  const correct = await onAction(action);

  // 再アタック判断
  if (correct && game.phase !== "gameover" && shouldReattack(level, knowledge, game, mySeat)) {
    await sleep(600);
    return runCpuTurn(game, mySeat, knowledge, level, mode, callbacks);
  } else if (correct && game.phase !== "gameover") {
    await sleep(600);
    // ステイ
    await onAction({ type: "stay" });
  }
}
