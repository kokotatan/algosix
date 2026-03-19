# ALGOSIX — ゲーム演出・アニメーション実装プロンプト
# （オフライン・CPU・オンライン 全モード共通）

---

## 概要

ゲームのすべてのモード（オフライン・CPU戦・オンライン戦）に共通の
演出・アニメーションを追加する。

**基本方針：**
- アニメーションは短く（0.3〜0.5s）、サクサクとしたテンポ感を維持
- 正解・不正解・勝利など「結果」の瞬間にだけ明確なフィードバックを出す
- CSS のみで実装（JS ライブラリ不使用）
- `prefers-reduced-motion` でアニメーションを無効化できるようにする
- オフライン・オンライン共通の CSS クラスとして定義し、モードによる分岐を最小化する

---

## 1. カードアニメーション

### 正解時 — めくれる（flip）

```css
.card.flip-reveal {
  animation: cardFlip 0.46s ease both;
}

@keyframes cardFlip {
  0%   { transform: perspective(600px) rotateY(0deg); }
  42%  { transform: perspective(600px) rotateY(90deg); opacity: 0.2; }
  58%  { transform: perspective(600px) rotateY(90deg); opacity: 0.2; }
  100% { transform: perspective(600px) rotateY(0deg); opacity: 1; }
}
```

**トリガー条件：** 相手のカードが `revealed: false → true` に変わった瞬間

```js
// GameUI.js の Card コンポーネント内
// justRevealed prop が true のときに flip-reveal クラスを付与
// 500ms 後に外す（親からタイマー制御）
```

### 不正解時 — シェイク

```css
.card.shake {
  animation: cardShake 0.40s ease both;
}

@keyframes cardShake {
  0%,100% { transform: translateX(0); }
  18%     { transform: translateX(-8px); }
  36%     { transform: translateX(8px); }
  54%     { transform: translateX(-5px); }
  72%     { transform: translateX(5px); }
}
```

**トリガー条件：** 不正解宣言が確定した瞬間、攻撃対象のカードにシェイクを適用

### 新しいカードが手に加わる — スライドイン（既存流用・調整）

```css
.card.slide-in {
  animation: slideIn 0.40s cubic-bezier(.22,1,.36,1) both;
}

@keyframes slideIn {
  from { transform: translateY(-16px) scale(0.84); opacity: 0; }
  to   { transform: translateY(0)     scale(1);    opacity: 1; }
}
```

### 宣言された瞬間 — ターゲットフラッシュ

```css
.card.flash-target {
  animation: flashTarget 0.32s ease both;
}

@keyframes flashTarget {
  0%   { box-shadow: none; }
  45%  { box-shadow: 0 0 0 3px #111, 0 0 18px rgba(0,0,0,0.35); }
  100% { box-shadow: none; }
}

/* 白カード版 */
.card.white.flash-target {
  animation: flashTargetWhite 0.32s ease both;
}

@keyframes flashTargetWhite {
  0%   { box-shadow: none; }
  45%  { box-shadow: 0 0 0 3px #111, 0 0 18px rgba(0,0,0,0.2); }
  100% { box-shadow: none; }
}
```

### アニメーション適用の共通関数

```js
// src/lib/animUtils.js

/**
 * カードに一時的なアニメーションクラスを付与する
 * @param {Function} setAnims - state setter
 * @param {string} key - "playerIndex-cardIndex" 形式
 * @param {string} animClass - CSSクラス名
 * @param {number} duration - ms（クラスを外すまでの時間）
 */
export function triggerCardAnim(setAnims, key, animClass, duration = 600) {
  setAnims(prev => ({ ...prev, [key]: animClass }));
  setTimeout(() => {
    setAnims(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, duration);
}
```

```js
// ゲーム画面での使い方（AlgoApp.js）
const [cardAnims, setCardAnims] = useState({});

// 正解時
triggerCardAnim(setCardAnims, `${pi}-${ci}`, "flip-reveal", 600);

// 不正解時（攻撃対象カード）
triggerCardAnim(setCardAnims, `${pi}-${ci}`, "shake", 500);

// 不正解時（自分の引いたカード追加）
triggerCardAnim(setCardAnims, `${G.cur}-new`, "slide-in", 500);

// 宣言した瞬間（攻撃対象カード）
triggerCardAnim(setCardAnims, `${pi}-${ci}`, "flash-target", 400);
```

```jsx
// GameUI.js の Card コンポーネントでアニメーションクラスを適用
function Card({ card, ..., animClass }) {
  let cls = `card ${size} ${card.color} ${face}`;
  if (animClass) cls += ` ${animClass}`;
  // ...
}
```

---

## 2. 連続正解カウンター

正解が連続したとき（2回以上）に一瞬バッジを表示してコンボ感を演出。

### 表示仕様

```
2連続: 「2連続！」
3連続: 「3連続！」
4連続以上: 「すごい！」

表示位置: 画面中央・山札の上あたり（center-pile エリア）
表示時間: 1.2秒
フォント: font-weight:900 / font-size:18px
```

### CSS

```css
.combo-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 30;
  pointer-events: none;
  animation: comboPop 1.2s cubic-bezier(.22,1,.36,1) both;
  background: #111;
  color: #fff;
  padding: 8px 20px;
  border-radius: 28px;
  font-size: 17px;
  font-weight: 900;
  font-family: 'Noto Sans JP', sans-serif;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

@keyframes comboPop {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
  18%  { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
  30%  { transform: translate(-50%, -50%) scale(1); }
  72%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
}
```

### 実装

```js
// state
const [comboCount, setComboCount] = useState(0);
const [showCombo, setShowCombo] = useState(false);

// 正解時に呼ぶ
function onCorrect() {
  const next = comboCount + 1;
  setComboCount(next);
  if (next >= 2) {
    setShowCombo(true);
    setTimeout(() => setShowCombo(false), 1300);
  }
}

// 不正解 or ターン終了時にリセット
function onWrong()    { setComboCount(0); }
function onTurnEnd()  { setComboCount(0); }

// コンボバッジのラベル
function comboLabel(count) {
  if (count >= 4) return "すごい！";
  return `${count}連続！`;
}
```

```jsx
{/* center-pile の中に配置 */}
<div className="center-pile" style={{ position: "relative" }}>
  {/* ... 既存の山札・引いたカード ... */}
  {showCombo && (
    <div className="combo-badge">{comboLabel(comboCount)}</div>
  )}
</div>
```

---

## 3. ターン開始演出

### 「あなたのターン！」パルス

自分のターンが回ってきたとき（`phase === "draw"` に切り替わった瞬間）に
自分のエリアを一瞬ハイライトする。

```css
/* my-area に適用 */
.my-area.turn-pulse {
  animation: turnPulse 0.6s ease both;
}

@keyframes turnPulse {
  0%   { box-shadow: 0 0 0 0 rgba(17,17,17,0); }
  35%  { box-shadow: 0 0 0 6px rgba(17,17,17,0.18); }
  100% { box-shadow: 0 0 0 0 rgba(17,17,17,0); }
}
```

```js
const [turnPulse, setTurnPulse] = useState(false);

useEffect(() => {
  // オフライン: 自分のターン開始
  // オンライン: isMyTurn が true になった瞬間
  if (isMyTurn && G?.phase === "draw") {
    setTurnPulse(true);
    setTimeout(() => setTurnPulse(false), 700);

    // バイブレーション（対応端末）
    if ("vibrate" in navigator) navigator.vibrate([50, 20, 50]);
  }
}, [isMyTurn, G?.phase]);
```

```jsx
<div className={`my-area${turnPulse ? " turn-pulse" : ""}`}>
  {/* ... */}
</div>
```

---

## 4. 勝利画面の演出強化

### 現状
- 勝者名を表示するだけ

### 変更後

#### フェーズ1（0〜0.4s）: バッジがスケールアップして登場

```css
.win-badge {
  animation: winBadgeIn 0.45s cubic-bezier(.22,1,.36,1) both;
}

@keyframes winBadgeIn {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
```

#### フェーズ2（0.3s〜）: 勝者名がスライドアップ

```css
.win-name {
  animation: winNameIn 0.5s cubic-bezier(.22,1,.36,1) 0.3s both;
}

@keyframes winNameIn {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

#### フェーズ3（0.6s〜）: 全員の手札を公開（順番にフリップ）

```jsx
// 勝利確定後、全プレイヤーの手札を順番にオープン表示
// 0.6s後から開始、カードごとに 0.12s ずつ遅延

function WinCardReveal({ players }) {
  const [revealedAll, setRevealedAll] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealedAll(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="win-hands">
      {players.map((player, pi) => (
        <div key={pi} className="win-hand-row">
          <span className="win-hand-name">{player.name}</span>
          <div style={{ display:"flex", gap:4 }}>
            {player.hand.map((card, ci) => (
              <div key={ci} style={{
                animationDelay: revealedAll ? `${(pi * player.hand.length + ci) * 0.08}s` : "0s",
              }}>
                <Card card={{ ...card, revealed: true }}
                  showNum size="sm"
                  animClass={revealedAll ? "flip-reveal" : ""}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

#### フェーズ4（全手札公開後〜）: ゲームサマリー表示

```jsx
// 勝利画面に追加するサマリー
function GameSummary({ log, players, winnerId }) {
  // ログから集計
  const totalTurns = log.filter(e => e.includes("がカードを引きました")).length;
  const correctByPlayer = players.map((p, i) => {
    const correct = log.filter(e => e.startsWith("正解") && e.includes(p.name)).length;
    const total   = log.filter(e => e.includes(p.name) && (e.startsWith("正解") || e.startsWith("不正解"))).length;
    return { name: p.name, correct, total, rate: total > 0 ? Math.round(correct/total*100) : 0 };
  });

  return (
    <div className="game-summary">
      <div className="summary-row">
        <span>総ターン数</span>
        <span>{totalTurns}</span>
      </div>
      {correctByPlayer.map((p, i) => (
        <div key={i} className="summary-row">
          <span>{p.name} 正解率</span>
          <span>{p.rate}%</span>
        </div>
      ))}
    </div>
  );
}
```

```css
.win-hands {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  max-width: 320px;
  animation: fadeIn 0.4s ease 1.4s both;
}

.win-hand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.win-hand-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--gray4);
  width: 60px;
  flex-shrink: 0;
  letter-spacing: 0.05em;
}

.game-summary {
  width: 100%;
  max-width: 280px;
  background: var(--bg);
  border: var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeIn 0.4s ease 2s both;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--gray4);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 5. パス渡し画面の演出（オフライン）

現状は静的なテキストだけ。ターン交代感をもう少し出す。

```css
/* パス渡し画面のリング — 現状のbreathアニメを少し強く */
.pass-ring {
  animation: passRing 2.2s ease-in-out infinite;
}

@keyframes passRing {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,0,0,0); transform: scale(1); }
  50%     { box-shadow: 0 0 0 18px rgba(0,0,0,0.05); transform: scale(1.03); }
}

/* プレイヤー名 — 登場アニメ */
.pass-name {
  animation: passNameIn 0.5s cubic-bezier(.22,1,.36,1) 0.1s both;
}

@keyframes passNameIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 6. ログの演出

ログエリアに新しいエントリが追加されるとき、先頭行がスライドダウンして登場する。

```css
.log-line:first-child {
  animation: logSlideIn 0.28s ease both;
}

@keyframes logSlideIn {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 7. prefers-reduced-motion 対応

```css
@media (prefers-reduced-motion: reduce) {
  .card.flip-reveal,
  .card.shake,
  .card.flash-target,
  .card.slide-in,
  .combo-badge,
  .my-area.turn-pulse,
  .win-badge,
  .win-name,
  .win-hands,
  .game-summary,
  .pass-ring,
  .pass-name,
  .log-line {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 実装ファイル構成

```
src/
  lib/
    animUtils.js     ← triggerCardAnim などユーティリティ（新規）
    stamps.js        ← スタンプ定義（新規）
  components/
    GameUI.js        ← Card に animClass prop 追加
    AlgoApp.js       ← cardAnims state / コンボカウンター / ターンパルス
    WinScreen.jsx    ← 勝利画面を独立コンポーネントに分離（新規推奨）
```

---

## 実装チェックリスト

### カードアニメーション
- [ ] `flip-reveal` — 正解時に相手カードへ適用
- [ ] `shake` — 不正解時に攻撃対象カードへ適用
- [ ] `flash-target` — 宣言直後に攻撃対象カードへ適用
- [ ] `slide-in` — 不正解で手に加わるカードへ適用

### コンボカウンター
- [ ] 2連続以上で `combo-badge` 表示
- [ ] 不正解・ターン終了でリセット

### ターン開始
- [ ] `turn-pulse` — 自分のターン開始時に my-area へ適用
- [ ] `navigator.vibrate` — 対応端末でバイブレーション

### 勝利画面
- [ ] `win-badge` スケールアップ
- [ ] `win-name` スライドアップ
- [ ] 全手札をシーケンシャルにフリップ公開
- [ ] ゲームサマリー（総ターン数・正解率）

### 共通
- [ ] `animUtils.js` に `triggerCardAnim` を実装
- [ ] `prefers-reduced-motion` 対応
- [ ] オフライン・CPU・オンライン全モードで動作確認

---

## 注意事項

- アニメーション時間は**0.5s以内**を原則とする（サクサク感を維持）
- コンボバッジは**1.2s**まで許容（ちゃんと読ませる）
- 勝利のシーケンスは**自動で進む**（ユーザー操作不要）
- `flip-reveal` と `shake` は**同時に発火しない**（どちらか一方）
- アニメーション中もタップ操作を受け付ける（`pointer-events: none` にしない）
