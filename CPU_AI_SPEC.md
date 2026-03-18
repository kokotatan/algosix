# コンピュータ戦（CPU AI）— 実装仕様書

---

## 対戦構成

### 個人戦 × CPU

| 設定 | 人間 | CPU | 合計 |
|---|---|---|---|
| 1 vs 1 | 1人（seat 0） | 1体（seat 1） | 2人戦 |
| 1 vs 2 | 1人（seat 0） | 2体（seat 1,2） | 3人戦 |
| 1 vs 3 | 1人（seat 0） | 3体（seat 1,2,3） | 4人戦 |

### ペア戦 × CPU

| 設定 | チームA | チームB | 合計 |
|---|---|---|---|
| 1人 + CPU vs CPU2体 | 人間（seat 0）+ CPU（seat 2） | CPU（seat 1）+ CPU（seat 3） | 4人戦 |
| 2人 vs CPU2体 | 人間（seat 0）+ 人間（seat 2） | CPU（seat 1）+ CPU（seat 3） | 4人戦 |

- seat 0 は常にプレイヤー1（人間）
- seat 2 は個人戦ではCPU、ペア戦では人間またはCPU（設定による）

---

## 難易度 3段階

### EASY — ランダム
論理的思考なし。ほぼランダムに行動。
```
- アタック対象: 伏せカードからランダム
- 宣言数字: 左右の制約から導ける候補の中からランダム
  ※ 完全ランダムは不自然なので、明らかに不可能な数字は除外する最低限の処理はする
- 再アタック: 50%の確率
- ステイ（ペア戦）: 50%の確率
```

### NORMAL — 基本推論
公開情報を元に候補を絞り込む。
```
情報管理:
  - 全プレイヤーのオープンカードを記録
  - 自分・他プレイヤーの宣言結果（正解/不正解）を記録
  - 各伏せカードの「候補数字セット」を維持・更新

候補の絞り込みロジック:
  1. 手札の並び順制約（左右のカードから数字の範囲を絞る）
  2. オープン済みカードの除外（同色同数字は1枚しかない）
  3. 過去の不正解結果から除外

アタック対象の選び方:
  - 候補数字が最も少ない（最も絞れている）カードを優先
  - 候補が1つなら必ずそこを狙う

宣言数字: 候補の中からランダム
再アタック: 次に候補1つのカードがあれば再アタック、なければパス
```

### HARD — ベイズ推論
確率分布を維持し、期待正解率で最適手を選ぶ。
```
情報管理（NORMALに加えて）:
  - 各伏せカードに確率分布を保持: { 6: 0.4, 7: 0.4, 8: 0.2 }
  - 全プレイヤーの行動を観察して確率を更新（ベイズ更新）
  - 他のCPUの宣言から間接情報も活用

アタック対象: 最高確率が最も高いカードを選ぶ
宣言数字: 確率最大の数字（deterministic）
再アタック: 次のターゲットの最高確率 > 60% なら再アタック
ミス演出: 5%の確率で意図的に外す（人間らしさのため）
```

---

## CPUの知識スコープ（チート禁止）

CPUは「正当に観察できる情報のみ」を使う。
人間の手札の数字は絶対に見えない。

| 情報 | EASY | NORMAL | HARD |
|---|---|---|---|
| 全オープンカード | 使用 | 使用 | 使用 |
| 手札の並び順制約 | 最低限 | 使用 | 使用 |
| 過去の宣言結果（全員分） | 使わない | 使用 | 使用 |
| 確率的推論（ベイズ更新） | なし | なし | 使用 |
| 人間・他CPUの手札の数字 | **見えない** | **見えない** | **見えない** |

---

## toss（トス）フェーズのCPU処理

ペア戦固有のフェーズ。パートナーが手札から1枚選んで現在のプレイヤーに見せる。

### パターン1: CPUがトスする側

```
表示: 「[CPU名] がトスしています...」（0.6〜1.0秒）
処理:
  - 自分の裏向きカードの中からAIが選ぶ
  - EASY:   ランダムに選ぶ
  - NORMAL: 現在のプレイヤー（CPU or 人間）が最も必要としそうな数字のカードを選ぶ
  - HARD:   現在のプレイヤーの候補絞り込みに最も貢献するカードを選ぶ
  - 選んだカードと数字を人間プレイヤーに表示する（個人戦の「引いたカード」と同じ扱い）

表示UI:
  ┌────────────────────────────────────┐
  │ [CPU名] がトスしました              │
  │                                    │
  │ パートナーの手札:                   │
  │  [黒?][白?][黒?][白?][黒?][白?]    │
  │         ↑                          │
  │   選ばれたカード（ハイライト）      │
  │                                    │
  │  ┌────────┐                        │
  │  │  白  6 │ ← 数字を大きく表示     │
  │  └────────┘                        │
  │                                    │
  │  [確認しました]                    │
  └────────────────────────────────────┘

  ゲームログ: 「[CPU名] が白6をトスしました」
```

### パターン2: 人間がトスする側（パートナーが人間の場合）

```
オフライン戦と同じフロー:
  - パス渡し画面を表示（「[人間パートナー名]にスマホを渡してください」）
  - パートナーが裏向きカードを1枚選んで「このカードを見せる」
  - パス渡し画面（「[現在のプレイヤー名]に戻してください」）
  - attackフェーズへ
```

---

## CPUのアタック処理（ペア戦）

ペア戦のアタックは「自分の手札から1枚選んでその数字で宣言」。

```js
function cpuAttackPair(level, game, mySeat, knowledge) {
  // 相手カードの選択（通常と同じロジック）
  const targetCard = selectTargetCard(level, game, mySeat, knowledge);

  // 自分の手札から宣言に使うカードを選ぶ
  const myHand = game.players[mySeat].hand;
  const myHiddenCards = myHand
    .map((c, i) => ({ card: c, index: i }))
    .filter(({ card }) => !card.revealed);

  let myCardIndex;
  if (level === "easy") {
    // ランダム
    myCardIndex = myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)].index;
  } else {
    // targetCardの候補数字と一致するカードを優先的に選ぶ
    const candidates = knowledge.candidates[targetCard.playerIndex][targetCard.cardIndex];
    const matching = myHiddenCards.filter(({ card }) => candidates.has(card.number));
    myCardIndex = matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)].index
      : myHiddenCards[Math.floor(Math.random() * myHiddenCards.length)].index;
  }

  return {
    targetPlayerIndex: targetCard.playerIndex,
    targetCardIndex:   targetCard.cardIndex,
    myCardIndex,
    declaredNumber:    game.players[mySeat].hand[myCardIndex].number,
  };
}
```

---

## ゲームフロー（CPU戦）

### 人間のターン
```
個人戦: draw → attack → continue/stay  （パス渡し画面なし）
ペア戦:
  - 自分がtossする側: toss画面（自分がカードを選ぶ） → attack
  - CPUがtossする側: 自動処理（表示なし） → attack
```

### CPUのターン（自動処理）
```
個人戦:
  1. 「[CPU名] が考えています...」表示（0.8〜1.5秒）
  2. draw（自動）
  3. cpuDecide() でアタック内容を決定
  4. ログ表示: 「[CPU名] が [対象] の [色] カードに [数字] と宣言」
  5. 正解 / 不正解を判定・処理
  6. 正解 → 0.6秒後に再アタック判断 → 再アタックなら 1. へ
  7. 不正解 / パス → 次のプレイヤーへ

ペア戦（CPUターン）:
  1. tossフェーズ
     - パートナーがCPUなら: 「[CPU名] がトスしています...」（0.6秒）→ 自動選択
     - パートナーが人間なら: パス渡し画面 → 人間がカードを選ぶ → パス渡し画面
  2. 「[CPU名] が考えています...」表示（0.8〜1.5秒）
  3. cpuAttackPair() でアタック内容を決定
  4. 以降は個人戦と同じ
```

---

## CPUの知識クラス実装

```js
// src/lib/cpuAI.js

export class CpuKnowledge {
  constructor(players, mySeatIndex, level) {
    this.mySeatIndex = mySeatIndex;
    this.level = level;

    // candidates[pi][ci] = Set<number> — 候補数字セット
    this.candidates = players.map(p =>
      p.hand.map(() => new Set(Array.from({ length: 12 }, (_, i) => i)))
    );

    // probs[pi][ci] = { [number]: probability } — HARDのみ
    this.probs = level === "hard"
      ? players.map(p => p.hand.map(() => Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [i, 1/12])
        )))
      : null;
  }

  // オープン時の更新
  onReveal(pi, ci, color, number) {
    // そのカードの候補を確定
    this.candidates[pi][ci] = new Set([number]);
    // 同色同数字を他の候補から除外
    this.candidates.forEach((playerCands, pIdx) => {
      playerCands.forEach((cands, cIdx) => {
        if (pIdx === pi && cIdx === ci) return;
        // 同じ色のカードが候補にあればそれを除外
        // （同色同数字は1枚しかないため）
      });
    });
    this.applyOrderConstraints();
  }

  // 不正解時の更新
  onWrongGuess(pi, ci, number) {
    this.candidates[pi]?.[ci]?.delete(number);
    if (this.probs) {
      delete this.probs[pi][ci][number];
      this.normalizeProbabilities(pi, ci);
    }
  }

  // 並び順制約の適用
  applyOrderConstraints() { /* 左右カードから範囲を絞る */ }

  // 確率の正規化（HARDのみ）
  normalizeProbabilities(pi, ci) { /* 合計1になるよう調整 */ }
}

// 難易度別アタック決定
export function cpuDecide(level, game, mySeat, knowledge, mode) {
  if (mode === "pair") return cpuDecidePair(level, game, mySeat, knowledge);
  return cpuDecideIndividual(level, game, mySeat, knowledge);
}

// 並び順から候補範囲を計算するユーティリティ
export function getOrderConstraints(hand, cardIndex) {
  const card = hand[cardIndex];
  const revealedLeft  = hand.slice(0, cardIndex).filter(c => c.revealed);
  const revealedRight = hand.slice(cardIndex + 1).filter(c => c.revealed);
  const leftCard  = revealedLeft.at(-1);
  const rightCard = revealedRight[0];

  let min = 0, max = 11;
  if (leftCard) {
    min = leftCard.number + (leftCard.color === card.color ? 1 : 0);
  }
  if (rightCard) {
    max = rightCard.number - (rightCard.color === card.color ? 1 : 0);
  }
  return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
}

// CPUターンを非同期で実行
export async function runCpuTurn(game, mySeat, knowledge, level, mode, callbacks) {
  const { setThinking, onAction, onToss } = callbacks;

  // トスフェーズ（ペア戦のみ）
  if (mode === "pair") {
    const partnerSeat = getPartnerIndex(game.players.length, mySeat);
    const partnerIsCpu = game.players[partnerSeat].isCpu;
    if (partnerIsCpu) {
      // CPUがトス: 思考演出 → カードを選ぶ → 人間に見せる
      onToss({ thinking: true });
      await sleep(600 + Math.random() * 400);
      const tossedCard = cpuSelectToss(level, game, partnerSeat, mySeat, knowledge);
      onToss({ thinking: false, tossedCard, waitForConfirm: true });
      // 人間が「確認しました」を押すまで待機（Promiseで解決）
      await waitForConfirm();
    }
    // パートナーが人間の場合はUIで処理（パス渡し画面 → 人間がカードを選ぶ）
  }

  // アタックフェーズ
  setThinking(true);
  await sleep(800 + Math.random() * 700);
  setThinking(false);

  const action = cpuDecide(level, game, mySeat, knowledge, mode);
  const correct = await onAction(action);

  // 再アタック判断
  if (correct && shouldReattack(level, knowledge, game, mySeat)) {
    await sleep(600);
    return runCpuTurn(game, mySeat, knowledge, level, mode, callbacks);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## セットアップ画面（CPU戦）

```
メニュー → コンピュータ戦 → 設定画面

┌─────────────────────────────────────┐
│ コンピュータ戦                       │
│                                     │
│ あなたの名前                         │
│  [__________]                       │
│                                     │
│ ゲームモード                         │
│  [個人戦]  [ペア戦]                 │
│                                     │
│ ─── 個人戦の場合 ───                │
│ CPUの数                             │
│  [1体]  [2体]  [3体]               │
│                                     │
│ ─── ペア戦の場合 ───                │
│ パートナー                           │
│  [CPU]  [フレンド（同じ端末）]      │
│                                     │
│  フレンド選択時: パートナーの名前   │
│  [__________]                       │
│                                     │
│ 難易度                              │
│  [EASY]      [NORMAL]    [HARD]    │
│  ランダム     基本推論    ベイズ推論  │
│                                     │
│ [ゲームスタート]                    │
└─────────────────────────────────────┘
```

---

## players の isCpu フラグ

```js
// 個人戦 1vs3 の例
players = [
  { id:0, name:"Yuki",  isCpu:false, seat:0 },  // 人間
  { id:1, name:"CPU-1", isCpu:true,  seat:1 },
  { id:2, name:"CPU-2", isCpu:true,  seat:2 },
  { id:3, name:"CPU-3", isCpu:true,  seat:3 },
]

// ペア戦（1人+CPU vs CPU2体）の例
players = [
  { id:0, name:"Yuki",  isCpu:false, seat:0, team:"A" },  // 人間
  { id:1, name:"CPU-1", isCpu:true,  seat:1, team:"B" },
  { id:2, name:"CPU-2", isCpu:true,  seat:2, team:"A" },  // 人間のパートナー
  { id:3, name:"CPU-3", isCpu:true,  seat:3, team:"B" },
]

// ペア戦（2人 vs CPU2体）の例
players = [
  { id:0, name:"Yuki",  isCpu:false, seat:0, team:"A" },  // 人間
  { id:1, name:"CPU-1", isCpu:true,  seat:1, team:"B" },
  { id:2, name:"Hana",  isCpu:false, seat:2, team:"A" },  // 人間のパートナー
  { id:3, name:"CPU-2", isCpu:true,  seat:3, team:"B" },
]
```

---

## AlgoApp.js のCPUターン処理

```js
// CPUのターンを検知して自動実行
useEffect(() => {
  if (gameMode !== "cpu") return;
  const cur = game.players[game.cur];
  if (!cur.isCpu) return;
  if (game.phase !== "draw" && game.phase !== "pass_to_partner") return;

  const knowledge = knowledgeRefs.current[game.cur];
  const mode = game.mode; // "individual" | "pair"

  runCpuTurn(game, game.cur, knowledge, cpuLevel, mode, {
    setThinking,
    onAction: (action) => handleCpuAction(action),
    onToss:   (toss)   => handleCpuToss(toss),
  });
}, [game.cur, game.phase]);
```

---

## 変更・追加ファイル一覧

### 新規追加

| ファイル | 内容 |
|---|---|
| `src/lib/cpuAI.js` | CpuKnowledgeクラス・cpuDecide・runCpuTurn・getOrderConstraints |

### 変更が必要

| ファイル | 変更内容 |
|---|---|
| `gameLogic.js` | `initGame` に `isCpu` フラグ追加 |
| `AlgoApp.js` | CPU戦モードの分岐。`useEffect` でCPUターン自動実行。`thinking` state追加 |
| `GameUI.js` | 思考中インジケーター。CPUターン中はアクションパネルをdisabled |

---

## 実装推奨順序

1. `cpuAI.js` の骨格を作る（クラス定義・インターフェースのみ）
2. `cpuDecideEasy` を実装 → 個人戦1vs1でテスト
3. 思考演出（sleep・thinking state）を実装
4. `cpuDecideNormal` を実装
5. `cpuDecideHard` を実装
6. ペア戦CPU対応（`cpuAttackPair` + CPUトス処理）
7. セットアップ画面にCPU戦オプションを追加
8. ペア戦の「人間パートナー」オプションを追加

---

## 難易度バランスの目安

| 難易度 | 想定勝率（プレイヤー側） | 特徴 |
|---|---|---|
| EASY | 70〜80% | 練習・慣れるための相手 |
| NORMAL | 40〜55% | ちゃんと考えれば勝てる |
| HARD | 20〜35% | 完璧に推論しないと勝てない |

実装後にプレイテストして調整する。
