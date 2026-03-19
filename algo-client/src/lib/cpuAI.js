// src/lib/cpuAI.js
import { getPartnerIndex } from "./gameLogic";

export class CpuKnowledge {
  constructor(players, mySeatIndex, level) {
    this.mySeatIndex = mySeatIndex;
    this.level = level;
    this.initCandidates(players);
  }

  // candidates をオブジェクト（p.id キー）で管理することで
  // 文字列IDのプレイヤー（オンライン人間プレイヤー）にも対応する
  initCandidates(players) {
    this.candidates = {};
    players.forEach(p => {
      this.candidates[p.id] = p.hand.map(() =>
        new Set(Array.from({ length: 12 }, (_, i) => i))
      );
    });
  }

  updateFromState(game) {
    if (this.level === 'easy') return;

    this.initCandidates(game.players);

    // 1. Collect all known cards
    const knownCards = [];
    game.players.forEach(p => {
      p.hand.forEach((c, ci) => {
        let isKnown = false;
        if (p.id === this.mySeatIndex) isKnown = true;
        if (c.revealed) isKnown = true;
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
    while (changed && iterations < 20) {
      changed = false;
      iterations++;

      game.players.forEach(p => {
        for (let i = 0; i < p.hand.length - 1; i++) {
          const candsLeft = this.candidates[p.id][i];
          const candsRight = this.candidates[p.id][i + 1];
          if (candsLeft.size === 0 || candsRight.size === 0) continue;

          const maxRight = Math.max(...candsRight);
          const minLeft = Math.min(...candsLeft);
          const colL = p.hand[i].color;
          const colR = p.hand[i + 1].color;

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

  onWrongGuess(targetPlayer, targetCard, guessNumber) {
    if (this.level !== 'hard') return;
    if (this.candidates[targetPlayer] && this.candidates[targetPlayer][targetCard]) {
      this.candidates[targetPlayer][targetCard].delete(guessNumber);
    }
  }
}

// ─── ヘルパー：p.id ではなく配列インデックスでチームを判定する ───
function getTeamByIdx(idx) {
  return idx % 2 === 0 ? "A" : "B";
}

// 敵エントリー配列: [{ p: playerObj, i: arrayIndex }]
function buildEnemyEntries(game, mySeat, mode) {
  const myIdx = typeof mySeat === "number"
    ? mySeat
    : game.players.findIndex(p => String(p.id) === String(mySeat));
  const myTeam = mode === "pair" ? getTeamByIdx(myIdx) : null;

  return game.players
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) =>
      mode === "pair"
        ? getTeamByIdx(i) !== myTeam
        : String(p.id) !== String(mySeat)
    );
}

// ターゲットの選択
export function selectTargetCard(level, game, mySeat, knowledge) {
  const mode = game.mode || "individual";
  const enemyEntries = buildEnemyEntries(game, mySeat, mode);

  const candidates = [];
  enemyEntries.forEach(({ p: enemy, i: enemyIdx }) => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        candidates.push({ playerIndex: enemyIdx, cardIndex: ci, card });
      }
    });
  });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// 宣言数字の決定
export function selectGuessNumber(level, targetCard, knowledge) {
  const playerId = targetCard.playerId; // selectTargetCard で付与するか、既存の playerIndex からIDを逆引き
  const cands = knowledge.candidates[targetCard.playerId]
    ? Array.from(knowledge.candidates[targetCard.playerId][targetCard.cardIndex])
    : [];
  if (cands.length === 0) return Math.floor(Math.random() * 12);
  return cands[Math.floor(Math.random() * cands.length)];
}

// NORMAL / HARD 用：候補数が最小の敵カードを選ぶ
function getBestAttackIndividual(knowledge, enemyEntries) {
  let bestCards = [];
  let minCandsSize = 999;

  enemyEntries.forEach(({ p: enemy, i: enemyIdx }) => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id]?.[ci];
        if (!cands) return;
        const size = cands.size;
        if (size > 0 && size < minCandsSize) {
          minCandsSize = size;
          bestCards = [{ playerIndex: enemyIdx, cardIndex: ci, cands }];
        } else if (size > 0 && size === minCandsSize) {
          bestCards.push({ playerIndex: enemyIdx, cardIndex: ci, cands });
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
    guessNumber,
  };
}

function getBestAttackPair(knowledge, enemyEntries, myHand, myHiddenCards) {
  let bestMatch = null;
  let minCandsSize = 999;

  enemyEntries.forEach(({ p: enemy, i: enemyIdx }) => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id]?.[ci];
        if (!cands) return;
        const size = cands.size;
        if (size > 0 && size < minCandsSize) {
          minCandsSize = size;
          const myPicked = myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)];
          const candArr = Array.from(cands);
          bestMatch = {
            targetPlayerIndex: enemyIdx,
            targetCardIndex: ci,
            myCardIndex: myPicked.index,
            guessNumber: candArr[Math.floor(Math.random() * candArr.length)],
          };
        }
      }
    });
  });

  if (bestMatch) return bestMatch;
  return cpuDecidePairEASY(enemyEntries, myHiddenCards, knowledge);
}

function cpuDecidePairEASY(enemyEntries, myHiddenCards, knowledge) {
  const cands = [];
  enemyEntries.forEach(({ p: e, i: eIdx }) => {
    e.hand.forEach((c, ci) => {
      if (!c.revealed) cands.push({ p: e.id, pIdx: eIdx, c: ci });
    });
  });
  if (cands.length === 0 || myHiddenCards.length === 0) return null;

  const target = cands[Math.floor(Math.random() * cands.length)];
  const myCard = myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)];

  let guessNumber;
  if (knowledge) {
    const targetCands = knowledge.candidates[target.p]?.[target.c];
    if (targetCands && targetCands.size > 0) {
      const arr = Array.from(targetCands);
      guessNumber = arr[Math.floor(Math.random() * arr.length)];
    } else {
      guessNumber = Math.floor(Math.random() * 12);
    }
  } else {
    guessNumber = Math.floor(Math.random() * 12);
  }

  return {
    targetPlayerIndex: target.pIdx,
    targetCardIndex: target.c,
    myCardIndex: myCard.index,
    guessNumber,
  };
}

// CPUの個人戦アタック決定
export function cpuDecideIndividual(level, game, mySeat, knowledge) {
  const mode = game.mode || "individual";
  const enemyEntries = buildEnemyEntries(game, mySeat, mode);

  if (level === "easy") {
    const targetCard = selectTargetCard(level, game, mySeat, knowledge);
    if (!targetCard) return null;
    return {
      targetPlayerIndex: targetCard.playerIndex,
      targetCardIndex: targetCard.cardIndex,
      guessNumber: Math.floor(Math.random() * 12),
    };
  }

  return getBestAttackIndividual(knowledge, enemyEntries);
}

// CPUのペア戦アタック決定
export function cpuDecidePair(level, game, mySeat, knowledge) {
  const enemyEntries = buildEnemyEntries(game, mySeat, "pair");
  const myIdx = typeof mySeat === "number"
    ? mySeat
    : game.players.findIndex(p => String(p.id) === String(mySeat));
  const myHand = game.players[myIdx].hand;
  const myHiddenCards = myHand.map((c, i) => ({ card: c, index: i })).filter(({ card }) => !card.revealed);

  if (myHiddenCards.length === 0) return null;

  if (level === "easy") {
    return cpuDecidePairEASY(enemyEntries, myHiddenCards, knowledge);
  }

  return getBestAttackPair(knowledge, enemyEntries, myHand, myHiddenCards);
}

export function cpuDecide(level, game, mySeat, knowledge, mode) {
  if (mode === "pair") return cpuDecidePair(level, game, mySeat, knowledge);
  return cpuDecideIndividual(level, game, mySeat, knowledge);
}

// CPUがトスするカードを選択
export function cpuSelectToss(level, game, mySeat, currentSeat, knowledge) {
  const myIdx = typeof mySeat === "number"
    ? mySeat
    : game.players.findIndex(p => String(p.id) === String(mySeat));
  const myHand = game.players[myIdx].hand;
  const myHiddenIndices = myHand
    .map((c, i) => (c.revealed ? null : i))
    .filter(i => i !== null);

  if (myHiddenIndices.length === 0) return null;
  return myHiddenIndices[Math.floor(Math.random() * myHiddenIndices.length)];
}

// 再アタック判断
export function shouldReattack(level, knowledge, game, mySeat) {
  if (level === "easy") return Math.random() > 0.5;

  const mode = game.mode || "individual";
  const enemyEntries = buildEnemyEntries(game, mySeat, mode);

  let minCandsSize = 999;
  enemyEntries.forEach(({ p: enemy }) => {
    enemy.hand.forEach((card, ci) => {
      if (!card.revealed) {
        const cands = knowledge.candidates[enemy.id]?.[ci];
        if (cands && cands.size < minCandsSize) minCandsSize = cands.size;
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
      onToss({ thinking: true });
      await sleep(600 + Math.random() * 400);
      const tossedCardIdx = cpuSelectToss(level, game, partnerSeat, mySeat, knowledge);

      const tossedCardObj = partner.hand[tossedCardIdx];
      const tossedCardInfo = { color: tossedCardObj.color, number: tossedCardObj.number, cardIndex: tossedCardIdx };

      onToss({ thinking: false, tossedCardInfo, waitForConfirm: true });

      if (waitForConfirm) {
        await waitForConfirm();
      }
    } else {
      return;
    }
  }

  // === アタックフェーズ ===
  setThinking(true);
  await sleep(1000 + Math.random() * 800);
  setThinking(false);

  const action = cpuDecide(level, game, mySeat, knowledge, mode);
  if (!action) return;

  const correct = await onAction(action);

  if (correct && game.phase !== "gameover" && shouldReattack(level, knowledge, game, mySeat)) {
    await sleep(600);
    return runCpuTurn(game, mySeat, knowledge, level, mode, callbacks);
  } else if (correct && game.phase !== "gameover") {
    await sleep(600);
    await onAction({ type: "stay" });
  }
}
