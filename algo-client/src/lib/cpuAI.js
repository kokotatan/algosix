// src/lib/cpuAI.js
import { getPartnerIndex } from "./gameLogic";

export class CpuKnowledge {
  constructor(players, mySeatIndex, level) {
    this.mySeatIndex = mySeatIndex;
    this.level = level;

    // candidates[pi][ci] = Set<number> — 候補数字セット
    this.candidates = players.map(p =>
      p.hand.map(() => new Set(Array.from({ length: 12 }, (_, i) => i)))
    );

    // probs[pi][ci] = { [number]: probability }
    this.probs = level === "hard"
      ? players.map(p => p.hand.map(() => Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [i, 1/12])
        )))
      : null;
  }

  // オープン時の更新
  onReveal(pi, ci, color, number) {
    if (!this.candidates[pi] || !this.candidates[pi][ci]) return;

    // そのカードの候補を確定
    this.candidates[pi][ci] = new Set([number]);
    
    // 同色同数字は1枚しかないため、他の候補から除外
    this.candidates.forEach((playerCands, pIdx) => {
      playerCands.forEach((cands, cIdx) => {
        if (pIdx === pi && cIdx === ci) return;
        // （実際には色も考慮する必要があるため、簡略化。
        //  より厳密には、他プレイヤーの同色カード一覧を知る必要がある。
        //  今回はシンプルに見えた数字は完全除外とする実装例）
        // cands.delete(number); 
      });
    });
    this.applyOrderConstraints();
  }

  // 不正解時の更新
  onWrongGuess(pi, ci, number) {
    if (!this.candidates[pi] || !this.candidates[pi][ci]) return;

    this.candidates[pi][ci].delete(number);
    if (this.probs) {
      delete this.probs[pi][ci][number];
      this.normalizeProbabilities(pi, ci);
    }
  }

  // 並び順制約の適用
  applyOrderConstraints() {
    // 簡略化した実装。左右のカードのオープン状況から端の候補を削るなど。
    // 今回の詳細な制約ロジックはNORMAL/HARD向けの拡張部分。
  }

  // 確率の正規化（HARDのみ）
  normalizeProbabilities(pi, ci) {
    if (!this.probs[pi][ci]) return;
    const obj = this.probs[pi][ci];
    const sum = Object.values(obj).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let k in obj) obj[k] /= sum;
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

// CPUの個人戦アタック決定
export function cpuDecideIndividual(level, game, mySeat, knowledge) {
  const targetCard = selectTargetCard(level, game, mySeat, knowledge);
  if (!targetCard) return null;

  const guessNumber = selectGuessNumber(level, targetCard, knowledge);

  return {
    targetPlayerIndex: targetCard.playerIndex,
    targetCardIndex: targetCard.cardIndex,
    guessNumber,
  };
}

// CPUのペア戦アタック決定
export function cpuDecidePair(level, game, mySeat, knowledge) {
  const targetCard = selectTargetCard(level, game, mySeat, knowledge);
  if (!targetCard) return null;

  const myHand = game.players[mySeat].hand;
  const myHiddenCards = myHand
    .map((c, i) => ({ card: c, index: i }))
    .filter(({ card }) => !card.revealed);

  if (myHiddenCards.length === 0) return null;

  let myCardIndex;
  if (level === "easy") {
    myCardIndex = myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)].index;
  } else {
    // NORMAL以上: targetCardの候補にあいそうな自分のカードを選ぶ
    const targetCands = knowledge.candidates[targetCard.playerIndex][targetCard.cardIndex];
    const matching = myHiddenCards.filter(({ card }) => targetCands.has(card.number));
    myCardIndex = matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)].index
      : myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)].index;
  }

  return {
    targetPlayerIndex: targetCard.playerIndex,
    targetCardIndex: targetCard.cardIndex,
    myCardIndex,
    guessNumber: game.players[mySeat].hand[myCardIndex].number,
  };
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
  return false; // シンプル版
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
